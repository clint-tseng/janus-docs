Maps and Models
===============

Now that you're familiar with the basics of Views and Models, it's time to take
on some trickier problems, and take a deeper look at managing Model data.

To start, we've been a little imprecise thus far about Maps and Models and the
differences between them. `Model` is a subclass of `Map`. Everything to do with
data storage and transformation is a feature of a `Map`: `.set`, `.get`, and `.get_`
as you've seen, but also other bits, like [`.shadow`](/api/map#shadow), [`.map`](/api/map#map)
transformation, enumeration, traversal, and more.

Model adds onto Map everything that presumes or defines some _meaning_ on top of
the data: attributes and bindings as you have seen, as well as validation.

When in doubt, there isn't really a reason not to use a `Model`. They are only
a little more encumbered than Maps, with minor things like needing to check for
attribute initial values when reading data out of the structure.

In this chapter, we will introduce and describe most (but not all) of the concepts
mentioned above.

Consolidating Orders
====================

It's pretty silly that we list out each individual ordered item, in whatever order,
however many times you order each. Let's try to consolidate this down, so that
we understand and display which items are being ordered, and how many of each.

To do this, we'll need some way to identify, when an order is made, whether orders
of that item already exist, and if so to add to its quantity.

We just describe a lookup process: given this information, find me the object associated
with it. Given this inventory item, find me the order information about it. Janus
Maps do not (yet?) support using object references as keys; only Strings. So to
do something like this, we'll have to introduce some kind of ID to our inventory.

The ID Lookup Approach
----------------------

Let's give each of our inventory items a unique ID. When we make our order, we'll
locate the appropriate item in our order, and add to it as needed. Here's what
that would process might like:

~~~ noexec
// models:
class Item extends Model {};
class Sale extends Model {
  order(item, qty) {
    const id = item.get_('id');
    const order = this.get_('order');
    order.set(id, order.get_(id) + qty);
  }
}

// views:
const ItemOrderer = Model.build(
  attribute('qty', class extends attribute.Number {
    initial() { return 1; }
  })
);
const ItemOrdererView = DomView.build(
  ItemOrderer,
  $(`<div><div class="info"/><label class="qty">Qty <span/></label><button/></div>`),
  template(
    find('.info').render(from.subject()),
    find('.qty span').render(from.vm().attribute('qty')).context('edit'),
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        view.closest_(Sale).order(item, view.vm.get_('qty'));
      })
  )
);
~~~

But how do we write the rest of this code, to show the ordered items and compute
the current total? We no longer have a `List`, we now have a `Map` which we can
neither `.flatMap` over, nor can we render it directly:

~~~
const map = new Map({ x: 14, y: 47 });
const app = new App();
stdlib.view($).registerWith(app.views);
return app.view(map);
~~~

Nothing.

Here's where we can take advantage of enumeration: Lists, Maps, and Models all
provide an `.enumerate` method which provides you with a `List` of all the keys
of the data structure. Just like when you `.map` a List in Janus, for example,
or in general perform any sort of transformation on a data structure, the resulting
structure will be updated as the source data changes.

~~~
const map = new Map({ x: 2, y: 5 });

const mappedMap = map.mapPairs((k, v) => v * 2);
const mapKeys = map.enumerate();
const mapValues = map.values();

map.set('z', 8);

return [ inspect.panel(mappedMap), mapKeys, mapValues ];
~~~

> If you don't like `.enumerate()`, you can call `.keys()` (or `.keys_()`) instead.

With this information, we can now complete the sample we began above. We can turn
our inventory and our order into Maps rather than Lists, and do our cross-referencing
by lookup across the two structures. But do we want to?

~~~
// models:
class Item extends Model {};
class Sale extends Model {
  order(item, qty) {
    const id = item.get_('id');
    const order = this.get_('order');
    order.set(id, order.get_(id) + qty);
  }
}

// views:
const ItemOrderer = Model.build(
  attribute('qty', class extends attribute.Number {
    initial() { return 1; }
  })
);
const ItemOrdererView = DomView.build(
  ItemOrderer,
  $(`<div>
    <div class="name"/><div class="price"/>
    <label class="qty">Qty <span/></label><button/>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('.qty span').render(from.vm().attribute('qty')).context('edit'),
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        view.closest_(Sale).subject.order(item, view.vm.get_('qty'));
      })
  )
);

const OrderedItem = Model.build(
  bind('item', from('sale').get('inventory').and('id')
    .all.flatMap((inventory, id) => inventory.get(id))),
  bind('qty', from('sale').get('order').and('id')
    .all.flatMap((order, id) => order.get(id))),
  bind('subtotal', from('item').get('price').and('qty')
    .all.map((price, qty) => price * qty))
);
const OrderedItemView = DomView.build(
  $('<div><span class="qty"/>x <span class="name"/> (<span class="subtotal"/>)</div>'),
  template(
    find('.qty').text(from('qty')),
    find('.name').text(from('item').get('name')),
    find('.subtotal').text(from('subtotal'))
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory').map(inventory => inventory.values())),
    find('.order').render(from.subject().and('order').all.map((sale, order) =>
      order.enumerate().map(id => new OrderedItem({ sale, id })))),
    find('.total').text(from('inventory').and('order').all.flatMap((inventory, order) =>
      order.enumerate().flatMap(id => Varying.mapAll(
        inventory.get(id).flatMap(item => item.get('price')),
        order.get(id),
        (price, qty) => price * qty
      )).sum()))
  )
);

// data:
const inventory = new Map({
  green: new Item({ id: 'green', name: 'Green Potion', price: 60 }),
  red: new Item({ id: 'red', name: 'Red Potion', price: 120 }),
  blue: new Item({ id: 'blue', name: 'Blue Potion', price: 160 })
});
const sale = new Sale({ inventory, order: new Map() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemOrdererView);
app.views.register(OrderedItem, OrderedItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

So, this all works. We are back to creating our own View Model-like constructs,
with the `OrderedItem` and its View. It takes in the Sale data, and the `id` of
the item it is intended to represent. From this information, it can compute everything
it needs to present the order quantity, the item name, and the subtotal.

To compute the order total, we once again have all the information we need given
the inventory and the order: we can look up the price for the item `id` out of
the inventory, and we can look up the quantity out of the order itself, and use
`Varying.mapAll` to do a little quick math on that information.

It all works, and from a computation standpoint it's all very solid. Every step
of computation here is a very straightforward mapping from well-defined information.
But to get to the point where you can convince yourself of this, you have to wade
through _so! much! homework!_ By being forced to work through all this `id` dereferencing
to get the data we are looking for, we introduce an incredible amount of visual
noise into our code.

Certainly, there are ways we could improve this situation while maintaining this
`id`-based approach. For one, we could change the structure of the `order` Map
to directly carry a reference to the Item, so we don't have to reference back
through the inventory to get information about it. In turn, the inventory won't
have to be a Map at all.

~~~
// models:
class Item extends Model {};
class Sale extends Model {
  order(item, qty) {
    const id = item.get_('id');
    const order = this.get_('order');
    let orderedItem = order.get_(id);
    if (orderedItem == null) {
      orderedItem = new OrderedItem({ item });
      order.set(id, orderedItem);
    }
    orderedItem.set('qty', orderedItem.get_('qty') + qty);
  }
}

// views:
const ItemOrderer = Model.build(
  attribute('qty', class extends attribute.Number {
    initial() { return 1; }
  })
);
const ItemOrdererView = DomView.build(
  ItemOrderer,
  $(`<div>
    <div class="name"/><div class="price"/>
    <label class="qty">Qty <span/></label><button/>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('.qty span').render(from.vm().attribute('qty')).context('edit'),
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        view.closest_(Sale).subject.order(item, view.vm.get_('qty'));
      })
  )
);

const OrderedItem = Model.build(
  bind('subtotal', from('item').get('price').and('qty')
    .all.map((price, qty) => price * qty))
);
const OrderedItemView = DomView.build(
  $('<div><span class="qty"/>x <span class="name"/> (<span class="subtotal"/>)</div>'),
  template(
    find('.qty').text(from('qty')),
    find('.name').text(from('item').get('name')),
    find('.subtotal').text(from('subtotal'))
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.order').render(from('order').map(order => order.values())),
    find('.total').text(from('order').flatMap(order =>
      order.values().flatMap(orderedItem => orderedItem.get('subtotal')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ id: 'green', name: 'Green Potion', price: 60 }),
  new Item({ id: 'red', name: 'Red Potion', price: 120 }),
  new Item({ id: 'blue', name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new Map() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemOrdererView);
app.views.register(OrderedItem, OrderedItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

So by moving the complexity from the structure of the data to the `order()` method,
we've cut significantly down on binding syntax. Simplifying the structure of the
data directly simplifies the referential complexity. All the computations here
are exactly the same, but it's more pleasant to look at.

On the other hand, this approach isn't without its drawbacks. For one, we have
inflated the amount of work we are doing imperatively, in `order()` which manipulates
our data. In general, the less logic we perform imperatively, the safer our code
ought to be.

Additionally, we now have this weird double-reference, where our `OrderedItem`
is stored within a Map looked up by an `id`, but there is no real guarantee that
the `item` contained _within_ each `OrderedItem` actually corresponds accurately
to the `id` it is mapped to. What if somebody changes that reference by accident?

These things might make you wonder: can we simplify the structure even more? Is
there some way we can cut down on both the structural complexity and these somewhat
leaky references?

The Direct Manipulation Approach
--------------------------------

It would be really nice if we didn't have two different structures at all. We
could do all of our work directly in a local context, with no cross-referencing
at all. As a result, we'd also not leak anything.

We could accomplish this using something like the OrderedItem View Model we've
been using, but let's try a radically different approach here.

~~~
// models:
class Item extends Model {};
class Sale extends Model {
  static from(inventory) {
    return new Sale({ order: inventory.map(item => item.shadow(OrderedItem)) });
  }
}

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
const itemCommon = (prefix) => template(
  find('.name').text(from('name')),
  find('.qty').render(from.attribute(`${prefix}-qty`)).context('edit'),
  find('.subtotal').text(from(`${prefix}-subtotal`))
);

const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    itemCommon('action'),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const OrderedItemView = DomView.build(
  $('<div><span class="qty"/>x <span class="name"/> (<span class="subtotal"/>)</div>'),
  itemCommon('order')
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('order'))
      .options({ renderItem: (item => item.context('orderer')) }),
    find('.order').render(from('order').map(order =>
      order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0)))),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = Sale.from(inventory);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView, { context: 'orderer' });
app.views.register(OrderedItem, OrderedItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

The key here was to merge all the information into a single Model. Now our item
metadata, our action data (where we track how many items to add to the order),
and our order data are all in a single place, which significantly simplifies all
the references.

Additionally, because the `order-qty`/`order-subtotal` data are congruous with
the `action-qty`/`action-subtotal` data, we get to take a nice shortcut by splitting
away the `itemCommon` bindings. Here, we do something you haven't seen yet, but
is not at all advanced metaphysics: we define a function that gives a `template`,
and we then use that template in two places, with a different parameter given for
each.

> # An Exercise
> It's also possible to merge the two `bind` expressions for the two subtotals
> on `OrderedItem` this way. It doesn't actually save any lines of code, but go
> ahead and give it a shot just to see if you understand how.

The `.order` method also simplifies greatly, because all the information is locally
present. We don't have to go fetch a lookup or even a subobject to do the simple
work of adding two numbers.

To prevent the need for multiple Lists, we `.filter` the inventory List to get
our ordered items list. Because this filter rule is always applied no matter what
codepath causes a change to the data, you'll notice that if you drop the order
count back to zero, the item will disappear from the ordered items list, just
like we'd want it to, even though we never had to explicitly account for this case.

To make this restructuring possible, we take advantage of Map shadowing. We didn't
really have to: we could have just nested the `Item` instance inside this `OrderedItem`
model we've made up, and done all our work with that nesting. It wouldn't be a
big deal, and in some respects it's actually the right thing to do.

But you've seen how nice that simplification is, and we get to take a look at the
shadowing feature. Map shadowing allows you to make a clone of a Map instance that
inherits its data from the original. If you manipulate inherited data on the shadow
copy, the shadow copy's edits will take precedence, but the original is unaffected.
Conversely, if you manipulate the original after the shadow exists, the shadow will
inherit that new information so long as it's not overridden.

~~~
const map = new Map({ x: 2, y: 4, z: 8 });
const shadow = map.shadow();

shadow.set({ w: 1, z: 16 });
map.set('y', -4);

return [ inspect.panel(map), inspect.panel(shadow) ];
~~~

> You can also [`.unset`](/api/map#unset) a key on a shadow to explicitly null
> it out even if the parent has a value, or [`.revert`](/api/map#revert) it to
> undo any shadow changes to a key.

Of course, in our sample above we are not shadowing from an `Item` to an `Item`.
Rather, we provide a classtype to the `.shadow` method, and the new shadowed Map
has the given classtype instead of retaining the parent type. This lets us substitute
our own behaviour for the shadowed copy.

In this case, the goal behind using `.shadow` was simply to get a copy of the original
data that we could mess around with without being afraid of goofing up the canonical
data. A benefit of using this approach rather than copying the data entirely is
that updates to the source Item will reflect in our purchase.

More typically, shadowing is helpful for, for example, making copies of data for
the purpose of presenting some sort of edit screen. The user can make changes at
will, and the final result can either be merged as the canonical data, or abandoned
with no overhead. There is one additional reason to use shadowing in this way.

~~~
const map = new Map({ x: 3 });
const shadow = map.shadow();
const modified = shadow.modified();

return [
  inspect.panel(map),
  inspect.panel(shadow),
  modified
];
~~~

Notice how you can make a change on the original, and the shadow is not considered
modified. Notice as well how you can make a change to the shadow—say, by overriding
the `x` value—and then _manually_ revert that edit by typing in the old value again,
and the change detection works as one would want it to.

> Of course, this is another case where shadowing isn't strictly necessary, since
> map offers a `.diff(otherMap)` which performs the same function.

This neat feature is done through a system called [Traversal](/further-reading/traversal),
which is sort of like structural MapReduce for your data, with a Janus twist. You
can learn more about them at the linked article, and later we will discuss model
serialization, which also depends on a traversal process.

Model Validation
================

Apart from attributes and bindings, the primary addition Model sports over Maps
is validation.

There is, of course, no reason you have to use the built-in validation system.
But having tried a few approaches out, we think we've settled on a pretty good
way of doing it that works well for a variety of purposes.

Like Model data`bind`ings, Janus validations are computations that draw on local
Model data, expressed as `from` chains. Unlike `bind`, `validate` expressions are
expected to return a particular data type: `types.validity`.

There are three members of `types.validity`: `valid`, `warning`, and `error`. They
are Case Classes.

We aren't going to cover case classes extensively here. If you are familiar with
Scala case classes, they sort of are and sort of aren't the same, due to limitations
in Javascript. If you aren't, you can think of them as sort of `enum`s, but which
can carry a value. You've actually been using them all over the place, without
realizing it.

~~~
const { valid, warning, error } = types.validity;

return [
  valid(),
  warning('You should really rethink your input here'),
  error('No way, buster.')
].map(inspect);
~~~

If you want to read more about case classes, and in particular how you can `.map`
over them, or `match` values out of them, you can take a look at the [theory
chapter](/theory/case-classes) on the subject. For now, we're just going to use
them to express our validation result.

~~~
const { valid, warning, error } = types.validity;

const Thing = Model.build(
  attribute('foo', attribute.Boolean),
  attribute('bar', attribute.Boolean),
  attribute('baz', attribute.Boolean),

  validate(from('foo')
    .map(foo => foo ? valid() : error('Please accept the foos of service'))),
  validate(from('bar').and('baz').all.map((bar, baz) => (bar && baz)
    ? warning('Are you sure you wish to evoke both bar and baz?') : valid()))
);

const field = (field) =>
  find('.' + field).render(from.attribute(field)).context('edit');
const ThingView = DomView.build(
  $('<div><span class="foo"/><span class="bar"/><span class="baz"/></div>'),
  template(field('foo'), field('bar'), field('baz'))
);

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Thing, ThingView);

const thing = new Thing();
return [ app.view(thing), inspect(thing.validations()), inspect(thing.valid()) ];
~~~

So we use `validate()` instead of `bind()`, but we still provide `from` expressions.
But specifically, we return one of `valid`, `warning`, or `error`. We can pass
whatever we want as the parameter to these functions; all Janus itself cares about
is the outer type. (This, in fact, is exactly why Janus _has_ case classes.) So
we could pass a String as we do here, or some Model describing the thing that is
wrong, or all manner of other information.

> As usual, we think the [theory section](/theory/maps-and-models#model-validation)
> on validation does a great job of showcasing the possibilities here more deeply.

Let's apply this to our ongoing sample, then. It's been silly this whole time that
you can order a negative number of items. Of course, in reality it would be more
productive to configure the `input` to not allow negative values at all, but for
the sake of the exercise let's do it this way for now.

~~~
const { error, valid } = types.validity;

// models:
class Item extends Model {};
class Sale extends Model {
  static from(inventory) {
    return new Sale({ order: inventory.map(item => item.shadow(OrderedItem)) });
  }
}

const product = (x, y) => x * y;
class OrderedItem extends Model.build(
  attribute('order-qty', attribute.Number),
  bind('order-subtotal', from('price').and('order-qty').all.map(product)),

  initial('action-qty', 1, attribute.Number),
  bind('action-subtotal', from('price').and('action-qty').all.map(product)),

  validate(from('action-qty').map(qty => (qty < 0) ? error() : valid()))
) {
  order() { this.set('order-qty', this.get_('order-qty') + this.get_('action-qty')); }
}

// views:
const itemCommon = (prefix) => template(
  find('.name').text(from('name')),
  find('.qty').render(from.attribute(`${prefix}-qty`)).context('edit'),
  find('.subtotal').text(from(`${prefix}-subtotal`))
);

const not = (x => !x);
const ItemOrdererView = DomView.build(
  $(`<div><span class="qty"/>x <span class="name"/> @<span class="price"/>
    <button>Order (<span class="subtotal"/>)</button></div>`),
  template(
    find('div').classed('error', from.subject().flatMap(s => s.valid().map(not))),
    itemCommon('action'),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { item.order(); })
  )
);

const OrderedItemView = DomView.build(
  $('<div><span class="qty"/>x <span class="name"/> (<span class="subtotal"/>)</div>'),
  itemCommon('order')
);

const SaleView = DomView.build($(`
  <div class="sale">
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('order'))
      .options({ renderItem: (item => item.context('orderer')) }),
    find('.order').render(from('order').map(order =>
      order.filter(orderedItem => orderedItem.get('order-qty').map(qty => qty > 0)))),
    find('.total').text(from('order').flatMap(order =>
      order.flatMap(orderedItem => orderedItem.get('order-subtotal')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = Sale.from(inventory);

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(OrderedItem, ItemOrdererView, { context: 'orderer' });
app.views.register(OrderedItem, OrderedItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~
~~~ styles
#sample-10 .sale .error { color: red; }
~~~

Maps and Models
===============

You've now seen most of the _features_ of Maps and Models. You've seen attributes,
databinding, enumeration, traversal, shadowing, and validation, applied in practical
contexts.

* Enumeration gives an actively-maintained List of the keys in a Map (or the indices
  in a List). This can be powerful for iterating across data with unknown shape.
* Shadowing gives a cloned child of a Map, freely modifiable while inheriting data 
  from its parent.
* Traversal enables processes like data diffing. You'll see more about this later.
* Attributes describe the type and various details about specific data properties.
  Data values can be bound as computations based on other values. These you have
  already seen previously.
* Validation rules are written just like data binding rules, but they return a
  special kind of value called a case class, which encodes the overall type of
  the result while still allowing you to return and work with arbitrary information
  about the result.

As we've mentioned previously, as you use Maps and Models more extensively, you'll
come to see how they can be used not only as data storage mechanisms, but rather
as [problem-solving spaces](/theory/maps-and-models#model-bindings). The use of
data binding in particular, and careful management of data inputs and outputs to
and from a Model, can yield a process in which you are not so much programming
as you are constructing little machines that spring and sproing as you need.

That understanding comes with time and experience.

Next Up
=======

The only thing we haven't yet discussed about Maps and Models is serialization.
We will do this in our next chapter, where we will turn our attention away from
the interface itself, and start thinking about [how to communicate with a server](/hands-on/client-server).

