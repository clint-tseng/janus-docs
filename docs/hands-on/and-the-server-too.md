And the Server, Too
===================

In our final stop on the grand tour around Janus, we are going to turn our attention
toward the server, and running your application upon it.

If you have no reason or desire to do this, it will still be beneficial to give
it a skim. Some of the things we will incidentally cover will still be useful.

There are many reasons to embrace server-side rendering. Sending real content over
the wire rather than a pile of code results in more SEO-friendly content, it is
far more accessible and friendly to screen readers and other assistive technologies,
and it cuts load time dramatically. Your servers are probably far more powerful
than the average client device, and more able to cache content for broad delivery.

Most Javascript web frameworks stand in the way of this objective. A web browser
and Node.js are not trivially different from each other, and it is difficult to
account for differences between the two in a single codebase. Integrating these
differences into application code typically results in serpentine flows that are
hard to reason about. Most frameworks, at least until very recently, answered this
question with, "run Chrome on your server."

Janus was created in an environment in which accessibility and Section 508 compliance
were non-negotiable (and for very good reason!), and so it sought to account for
these concerns from the beginning.

Let's take a look at server-side rendering.

Getting Started
===============

The first step here we won't actually need to do in these samples: import a DOM
implementation. We don't need anything full and heavy like JSDom, because we won't
be using fancy bleeding-edge features, nor pumping events and scripts through the
generated DOM. We just need the basics.

[Domino](https://github.com/fgnass/domino), which implements only through DOM level
4, is more than sufficient, and is more performant than its heavier-weight siblings
for our purposes. [Cheerio](https://github.com/cheeriojs/cheerio) is another great
option, though it has been less extensively tested with Janus.

In these samples, we'll just be using `$` as we have been, and it's all going to
work off browser DOM. But if you get `$` using either of the above (paired with
jQuery or Zepto in the case of Domino), everything here will work in Node.js exactly
as we promise. That's how this very documentation works, in fact.

So let's try rendering some markup. We'll use a slightly cut-down version of our
sample code here, since most of it doesn't really matter.

~~~
// "server":
const getInventory = (type, callback) => {
  const data = {
    potions: [
      { name: 'Green Potion', price: 60 },
      { name: 'Red Potion', price: 120 },
      { name: 'Blue Potion', price: 160 }
    ],
    equipment: [
      { name: 'Blue Mail', price: 250 },
      { name: 'Red Mail', price: 400 }
    ]
  };
  setTimeout(callback.bind(null, data[type]), 200);
};

// resolvers:
class InventoryRequest extends Request {};
const inventoryResolver = (request) => {
  const result = new Varying(types.result.pending());
  getInventory(request.options.type, inventory => {
    result.set(types.result.success(Inventory.deserialize(inventory)));
  });
  return result;
};

// models:
class Item extends Model {};
const Inventory = List.of(Item);
const Sale = Model.build(
  attribute('type', class extends attribute.Enum {
    initial() { return 'potions'; }
    _values() { return [ 'potions', 'equipment' ]; }
  }),
  attribute('inventory', attribute.Reference.to(from('type')
    .map(type => new InventoryRequest({ type })))),
  bind('order', from('inventory').map(inventory =>
    (inventory == null) ? new List()
    : inventory.map(item => item.shadow(OrderedItem))))
);

const product = (x, y) => x * y;
class OrderedItem extends Model.build(
  attribute('order-qty', attribute.Number),
  bind('order-subtotal', from('price').and('order-qty').all.map(product)),

  initial('action-qty', 1, attribute.Number),
  bind('action-subtotal', from('price').and('action-qty').all.map(product))
) {
  order() { this.set('order-qty', this.get_('order-qty') + this.get_('action-qty')); }
}

// views:
const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    find('.name').text(from('name')),
    find('.qty').render(from.attribute('action-qty')).context('edit'),
    find('.subtotal').text(from('action-subtotal')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const SaleViewModel = Model.build(
  bind('ordered-items', from.subject('order').map(order =>
    order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0))))
);
const SaleView = DomView.build(SaleViewModel, $(`
  <div class="sale">
    <div class="type"/>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.type').render(from.attribute('type')).context('edit'),
    find('.inventory').render(from('order')),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView);
app.views.register(Sale, SaleView);

app.resolvers.register(InventoryRequest, inventoryResolver);

return app.view(new Sale()).markup();
~~~

Well, that mostly worked. We have some markup, and clearly _some_ of our data
made it where we wanted. But because our data request takes time to resolve, our
actual inventory does not make it into the payload. We need some way of waiting
until all the work is done before grabbing the markup.

We saw how to do this in the [previous chapter](/hands-on/client-and-server#tracking-app-events),
when we listened to App for `resolvedRequest` events for the sake of implementing
a loading state of sorts. We could implement the same sort of thing here, but what
if one resolved request triggers another? Say that loading information about the
authenticated user then results in loading information about their notifications,
for example. That definitely complicates our homework.

Thankfully, Janus has already done this for us, and provides an answer in the form
of the `Manifest`.

~~~
// "server":
const getInventory = (type, callback) => {
  const data = {
    potions: [
      { name: 'Green Potion', price: 60 },
      { name: 'Red Potion', price: 120 },
      { name: 'Blue Potion', price: 160 }
    ],
    equipment: [
      { name: 'Blue Mail', price: 250 },
      { name: 'Red Mail', price: 400 }
    ]
  };
  setTimeout(callback.bind(null, data[type]), 200);
};

// resolvers:
class InventoryRequest extends Request {};
const inventoryResolver = (request) => {
  const result = new Varying(types.result.pending());
  getInventory(request.options.type, inventory => {
    result.set(types.result.success(Inventory.deserialize(inventory)));
  });
  return result;
};

// models:
class Item extends Model {};
const Inventory = List.of(Item);
const Sale = Model.build(
  attribute('type', class extends attribute.Enum {
    initial() { return 'potions'; }
    _values() { return [ 'potions', 'equipment' ]; }
  }),
  attribute('inventory', attribute.Reference.to(from('type')
    .map(type => new InventoryRequest({ type })))),
  bind('order', from('inventory').map(inventory =>
    (inventory == null) ? new List()
    : inventory.map(item => item.shadow(OrderedItem))))
);

const product = (x, y) => x * y;
class OrderedItem extends Model.build(
  attribute('order-qty', attribute.Number),
  bind('order-subtotal', from('price').and('order-qty').all.map(product)),

  initial('action-qty', 1, attribute.Number),
  bind('action-subtotal', from('price').and('action-qty').all.map(product))
) {
  order() { this.set('order-qty', this.get_('order-qty') + this.get_('action-qty')); }
}

// views:
const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    find('.name').text(from('name')),
    find('.qty').render(from.attribute('action-qty')).context('edit'),
    find('.subtotal').text(from('action-subtotal')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const SaleViewModel = Model.build(
  bind('ordered-items', from.subject('order').map(order =>
    order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0))))
);
const SaleView = DomView.build(SaleViewModel, $(`
  <div class="sale">
    <div class="type"/>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.type').render(from.attribute('type')).context('edit'),
    find('.inventory').render(from('order')),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView);
app.views.register(Sale, SaleView);

app.resolvers.register(InventoryRequest, inventoryResolver);

return inspect(Manifest.run(app, new Sale()).result);
~~~

The `Manifest` utility is quite clever. Give it an `App` and a `Model` that you'd
like rendered in full, and it'll spin everything up, wait until all your requests
and data are settled, then report the result at `.result`.

Manifest will never settle the `.result` as a `complete` type until all pending
works is complete. Whenever the last known Request is resolved (remember, it can
tell by the `app` all the in-flight requests), it will wait one event loop tick,
and if no _new_ requests have been made, it will settle the `.result`.

> It also does some homework to sandbox the events of the given `app`, so that
> concurrent page renders do not pollute each other.

To actually extract our result, we can `.react` and `match` against the `.result`,
as we did for the loading state in the last chapter. This makes sense if you have
a lot of tools that work with Varying and other Janus primitives already.

But, if as typically is the case, you're plugging this all into some framework
like [Express](https://expressjs.com), it will likely be more straightforward
to use `.then`:

~~~
// "server":
const getInventory = (type, callback) => {
  const data = {
    potions: [
      { name: 'Green Potion', price: 60 },
      { name: 'Red Potion', price: 120 },
      { name: 'Blue Potion', price: 160 }
    ],
    equipment: [
      { name: 'Blue Mail', price: 250 },
      { name: 'Red Mail', price: 400 }
    ]
  };
  setTimeout(callback.bind(null, data[type]), 200);
};

// resolvers:
class InventoryRequest extends Request {};
const inventoryResolver = (request) => {
  const result = new Varying(types.result.pending());
  getInventory(request.options.type, inventory => {
    result.set(types.result.success(Inventory.deserialize(inventory)));
  });
  return result;
};

// models:
class Item extends Model {};
const Inventory = List.of(Item);
const Sale = Model.build(
  attribute('type', class extends attribute.Enum {
    initial() { return 'potions'; }
    _values() { return [ 'potions', 'equipment' ]; }
  }),
  attribute('inventory', attribute.Reference.to(from('type')
    .map(type => new InventoryRequest({ type })))),
  bind('order', from('inventory').map(inventory =>
    (inventory == null) ? new List()
    : inventory.map(item => item.shadow(OrderedItem))))
);

const product = (x, y) => x * y;
class OrderedItem extends Model.build(
  attribute('order-qty', attribute.Number),
  bind('order-subtotal', from('price').and('order-qty').all.map(product)),

  initial('action-qty', 1, attribute.Number),
  bind('action-subtotal', from('price').and('action-qty').all.map(product))
) {
  order() { this.set('order-qty', this.get_('order-qty') + this.get_('action-qty')); }
}

// views:
const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    find('.name').text(from('name')),
    find('.qty').render(from.attribute('action-qty')).context('edit'),
    find('.subtotal').text(from('action-subtotal')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const SaleViewModel = Model.build(
  bind('ordered-items', from.subject('order').map(order =>
    order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0))))
);
const SaleView = DomView.build(SaleViewModel, $(`
  <div class="sale">
    <div class="type"/>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.type').render(from.attribute('type')).context('edit'),
    find('.inventory').render(from('order')),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView);
app.views.register(Sale, SaleView);

app.resolvers.register(InventoryRequest, inventoryResolver);

// do weird things because samples do not work asynchronously:
const result = new Varying();
Manifest.run(app, new Sale()).then(view => {
  result.set(view.markup());
});
return result;
~~~

Okay, so yeah, we end up just dumping the result back into a `Varying` because
the samples system on this documentation site really expects the results synchronously,
and `Varying` is the best way to feed it a value asynchronously.

But why is there a `types.result` in there, and can this Promise ever be rejected?

Failed Renders
==============

It's important to have some mechanism by which to communicate that something went
wrong in the course of our page render, so that we don't try to send a broken page
back to the user, and not with a `200 OK` result.

Ideally, we have some sort of definable set of rules where we can look over the
values we got, and verify that they look like what we'd expect. That set of rules
would operate off the local data context, and report back in some kind of format
that indicated to the Manifest whether things succeeded or failed, while still
communicating details about that result.

—we already have this! We have Model validation. Let's introduce the idea that
the requested Inventory `type` might not be a value we expect, and modify our
sample to account for this.

~~~
// "server":
const getInventory = (type, callback) => {
  const data = {
    potions: [
      { name: 'Green Potion', price: 60 },
      { name: 'Red Potion', price: 120 },
      { name: 'Blue Potion', price: 160 }
    ],
    equipment: [
      { name: 'Blue Mail', price: 250 },
      { name: 'Red Mail', price: 400 }
    ]
  };
  setTimeout(callback.bind(null, data[type]), 200);
};

// resolvers:
class InventoryRequest extends Request {};
const inventoryResolver = (request) => {
  const result = new Varying(types.result.pending());
  getInventory(request.options.type, inventory => {
    if (inventory == null) result.set(types.result.failure());
    else result.set(types.result.success(Inventory.deserialize(inventory)));
  });
  return result;
};

// models:
class Item extends Model {};
const Inventory = List.of(Item);
const Sale = Model.build(
  attribute('type', class extends attribute.Enum {
    initial() { return 'potions'; }
    _values() { return [ 'potions', 'equipment' ]; }
  }),
  attribute('inventory', attribute.Reference.to(from('type')
    .map(type => new InventoryRequest({ type })))),
  bind('order', from('inventory').map(inventory =>
    (inventory == null) ? new List()
    : inventory.map(item => item.shadow(OrderedItem))))
);

const product = (x, y) => x * y;
class OrderedItem extends Model.build(
  attribute('order-qty', attribute.Number),
  bind('order-subtotal', from('price').and('order-qty').all.map(product)),

  initial('action-qty', 1, attribute.Number),
  bind('action-subtotal', from('price').and('action-qty').all.map(product))
) {
  order() { this.set('order-qty', this.get_('order-qty') + this.get_('action-qty')); }
}

// views:
const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    find('.name').text(from('name')),
    find('.qty').render(from.attribute('action-qty')).context('edit'),
    find('.subtotal').text(from('action-subtotal')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const SaleViewModel = Model.build(
  bind('ordered-items', from.subject('order').map(order =>
    order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0))))
);
const SaleView = DomView.build(SaleViewModel, $(`
  <div class="sale">
    <div class="type"/>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.type').render(from.attribute('type')).context('edit'),
    find('.inventory').render(from('order')),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView);
app.views.register(Sale, SaleView);

app.resolvers.register(InventoryRequest, inventoryResolver);

// page wrapper to hold our validations:
const SalePage = Sale.build(
  validate(from('inventory').map(i =>
    (i != null) ? types.validity.valid()
    : types.validity.error({ code: 400, message: 'Unexpected type value' })))
);

// request handler:
const type = 'whoops'; // say this came in through a querystring parameter.
const salePage = new SalePage({ type });
return inspect(Manifest.run(app, salePage).result);
~~~

If you change the `type` above to `potions`, you'll get a success. If you leave
it as some nonsense value, you'll get a failure, containing a List of all the
validation failure messages. This way, the layer of your code that interfaces
with the final HTTP result can interpret the problems and send a response as
appropriate.

Our other little trick here is to call `Sale.build` to subclass Sale with some
additional schema declarations. Sale is a Model, after all, and Model.build is
always available.

Accounting for Environment Differences
======================================

Of course, determining page render completion and success is only one roadblock
on the way to server-side rendering. As noted in the introduction to this chapter,
we also need to account for environmental differences between client and server.

Interface Differences
---------------------

Often, for instance, the process of requesting data from some business API will
look completely different behind your firewall, running in Node.js.

This is exactly why App, Library, Requests, and Resolvers work the way they do.
Requests describe in a purely data-oriented way the remote resource you are seeking.
This provides a buffer between _needing_ a remote resource and _obtaining_ it.

App, and the Libraries it carries, provide the other buffer. Resolvers are the
only things that understand how to translate those Requests into actual physical
operations. (By default,) Apps use their `.resolvers` Library to actually determine
which Resolvers pertain to which Requests, and therefore provide an opportunity
to differentiate behaviour in different environments without needing to branch
deep within your application code.

Perhaps you can already imagine this, but typically this is done by maintaining
two separate bootstrap files, one for the server and the other for the client.
Here's just one possible organization:

~~~
// get this back because we clobber it in our samples:
const NativeMap = window.Map;

////////////////////////////////////////
// inventory.js

class Inventory extends Model {};
Inventory.requests = {
  read: class extends Request {}
};


////////////////////////////////////////
// resolvers/client.js

const clientResolvers = new NativeMap();
clientResolvers.set(Inventory.requests.read, (request) => {
  // use fetch/ajax/websockets/whatever to get a response over the web.
  return new Varying(types.result.success('the web says 42'));
});


////////////////////////////////////////
// resolvers/server.js

const serverResolvers = new NativeMap();
serverResolvers.set(Inventory.requests.read, (request) => {
  // use request/superagent/whatever to get a response over intranet.
  return new Varying(types.result.success('the server says 42'));
});


////////////////////////////////////////
// client.js

// const $ = require('jquery');
const clientApp = new App();

// (register all Views; not pictured.)

// register all Model resolvers:
for (const Model of [ Inventory ])
  for (const request of Object.values(Model.requests))
    clientApp.resolvers.register(request, clientResolvers.get(request));

// usually you'd then do something like this:
// const page = new Page({ path, params, auth });
// const view = clientApp.view(page);
// view.wireEvents();
// $('#app').append(view.artifact());

// but for this sample we'll just do this:
const clientResult = clientApp.resolve(new Inventory.requests.read());


////////////////////////////////////////
// server.js

// const domino = require('domino');
// const jq = require('jquery');
// const window = domino.createWindow(html);
// const $ = jq(window);
const serverApp = new App();

// (register all Views; not pictured.)

// register all Model resolvers:
for (const model of [ Inventory ]) {
  for (const name of Object.keys(model.requests)) {
    const request = model.requests[name];
    serverApp.resolvers.register(request, serverResolvers.get(request));
  }
}

// usually you'd return serverApp and use it to handle various endpoints, for example:
// server.get('/', (request, response) => {
//   Manifest.run(serverApp, new Homepage())
//     .then(result => { response.write(result.markup()); });
// });

// but for this sample we'll just do this:
const serverResult = serverApp.resolve(new Inventory.requests.read());



return [ clientResult, serverResult ];
~~~

This way, the important environmentally contextual bits of sending and receiving
data over the wire can be written modularly and independently, and easily pulled
into your application as you assemble it. Assembly is always the last big step
in a well-written Janus application, when you pull all your different modules together
into a single App context.

> # Also,
> In some cases, you may want to use a similar technique with Views. If you have
> Views that render complex visualizations, for example, you may want to return
> a formatted table legible to screen readers. Write that View separately and
> register _that_ instead of your fancy interactive chart.
>
> In the case of this documentation application, we don't try to use CodeMirror
> on the server-side: it does not like the simplified environment of domino.
> So we have an alternative View we render that just puts the sample code in a
> `<pre/>` tag.

So given the layers of indirection Janus imposes between your pure data modelling
and your I/O operations, it is not a huge pain to differentiate your code flow
for different environments.

But what happens if the data _itself_ needs to work differently in some cases?

Serialization Differences
-------------------------

Basic serialization is built in to Janus data structures, and it is pretty straightforward
to customize it if you'd like.

~~~
const simple = new Map({ w: new Map({ x: 1, y: new List([ 2, 3 ]) }), z: 4 });

class ClassOverride extends Model {
  serialize() {
    return { x: this.get_('x'), y: this.get_('y').serialize() };
  }
}
const classOverridden = new ClassOverride({ x: 1, y: new List([ 2, 3 ]) });

const AttrSpecified = Model.build(
  attribute('x', class extends attribute.Attribute {
    serialize() { return this.getValue_() * 2; }
  }),
  attribute('y', class extends attribute.Attribute {
    get transient() { return true; }
  }),
  transient('z')
);
const attrSpecified = new AttrSpecified({ x: 1, y: 2, z: 3 });

return [
  inspect(simple.serialize()),
  inspect(classOverridden.serialize()),
  inspect(attrSpecified.serialize())
];
~~~

But sometimes, you might find that you need to grab a different subset of data,
or format it differently, in order to account for different cases. In a typical
object-oriented environment, this would be a massive headache: if the difference
in question is buried below many layers of recursion, you're suddenly faced with
some nasty options.

You could implement an entire alternate recursion path, but then you have a ton
of redundant code just to call a different method in some branch or another. You
could try to thread some kind of options flag or hash through to the critical point,
but this is a ton of paperwork and overhead for a simple task. Maybe you'd consider
some kind of macro-based approach, but Javascript doesn't have those.

In Janus, serialization is not object-oriented; the overall control flow inverts
control and puts it in the caller's hand.

~~~
class Person extends Model {};
class Thing extends Model {};
class Metadata extends Model {};

const data = new List([
  new Person({
    name: 'Alice',
    metadata: new Metadata({ extra: 'data' }),
    things: new Map({
      a: new Thing({ name: 'a', metadata: new Metadata({ more: 'data' }) }),
      b: new Thing({ name: 'b', metadata: new Metadata({ more: 'data' }) })
    })
  }),
  new Person({
    name: 'Bob',
    metadata: new Metadata({ extra: 'data' }),
    things: new Map({
      c: new Thing({ name: 'c', metadata: new Metadata({ more: 'data' }) }),
      d: new Thing({ name: 'd', metadata: new Metadata({ more: 'data' }) })
    })
  })
]);

const serializeWithoutMetadata = Traversal.natural_({ map: (k, v) =>
  (v instanceof Metadata) ? types.traversal.nothing()
  : types.traversal.delegate(Traversal.default.serialize.map)
});

return [
  inspect(data.serialize()),
  inspect(serializeWithoutMetadata(data))
];
~~~

There is much more detail about this sort of process in the [Further Reading
chapter](/further-reading/traversal) on Traversal, but the essence here is that
we define a new function that will be called for every data pair in the whole data
structure tree, and returns an instruction on how to proceed.

In this case, we want to exclude all `Metadata` instances, and so if we see that
the `v` value is an instance, we just return `nothing()`. Otherwise, we `delegate`
control over the operation back to the default serialization function, which takes
care of all the usual behaviour like recursing into substructures and checking up
on `serialize()` methods. `delegate` only turns control over temporarily, for the
immediate current data pair; your own function regains control immediately after.
`defer` gives up control for the entire subtree.

Again, you can read a lot more about Traversal [here](/further-reading/traversal).
It is a powerful, flexible way to process and transform data. Using different Traversal
functions, you can invoke different serialization processes, each from a different
Resolver for a different purpose.

Deserialization
---------------

You may also need to _deserialize_ data in different ways, also in the context of
different Resolvers. (This is why the Resolver is generally responsible for performing
the deserialization itself, rather than, say, the Reference attribute).

Basic deserialization is pretty straightforward, and is a big reason to use the
`attribute.Model` and `attribute.List` attribute types:

~~~
class Person extends Model {};
const People = List.of(Person);

class Thing extends Model.build(
  attribute('people', attribute.List.of(People))
){} // we do this weird syntax just so the class has a name for the inspector.
const Things = List.of(Thing);

return inspect.panel(Things.deserialize([{
  name: 'one',
  people: [{ name: 'Alice' }, { name: 'Bob' }]
}, {
  name: 'two',
  people: [{ name: 'Chelsea' }, { name: 'David' }]
}]));
~~~

Overriding this behaviour _is_ a case of overriding a method: `static deserialize`.

~~~
class Person extends Model {
  static deserialize(data) {
    return new Person(Object.assign({ type: 'person' }, data));
  }
};
const People = List.of(Person);

return inspect.panel(People.deserialize([
  { name: 'Alice' },
  { name: 'Bob' }
]));
~~~

Because you can't Traverse over plain data structures, the typical approach for
dealing with deserialization in general, and differing implementations thereof,
is to manipulate the plain data when it comes in, either before or within the
`@deserialize` method.

Recap
=====

This was a bit of a potpourri chapter, but in general we've been discussing issues
pertaining to communication and server-side rendering.

* The Manifest is a simple but powerful tool to help manage the lifecycle of rendering
  a page on a server.
  * It does the work of ensuring that all Requests are resolved before reporting
    a final result.
  * That final result could be an `error` if the Model's validation rules turn
    up something amiss.
  * You can use `.result` as a Varying to discover the eventual result, or you
    can use the `.then` interface Manifest provides.
* Because Requests provide a purely semantic way to define necessary remote resources,
  and App and Library provide a layer of indirection between Requests and Resolvers,
  it is easy to provide different Resolvers in different contexts.
  * You can do this with Views, too.
  * This is typically made concrete when assembling your application, which is
    usually the very last step and done separately for client and server.
* Serialization and other data transformation exercises are made highly flexible
  by the existence of Traversal.
  * You can override `#serialize` on Model or Attribute for basic universal customization.
  * But Traversal allows much more fine-grained control by the caller.

What we have shown is not all that's possible with server-side rendering. This
documentation website, for example, is actually a unique hybrid: we statically
generate all content and serve it as plain HTML over the wire, but once you land
on a page in the client, all navigation is done virtually and page content is fetched
and rendered locally in the client.

This allows a really great performance characteristic: on initial load, the content
is usable the moment the browser puts text on screen; the user does not need to
wait for a script to load to begin reading. But once the application is fully loaded,
it's much faster to fetch just the article content, and render it on the client.

You can see the code for the static page generation [here](https://github.com/issa-tseng/janus-docs/blob/master/src/build/json-to-html.js).

Next Up
=======

You made it. This is it.

We just have some [final thoughts](/hands-on/fin).

