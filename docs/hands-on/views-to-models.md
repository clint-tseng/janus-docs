From Views to Models
====================

We haven't explored Views exhaustively, but we're going to change focus for a
moment and take a look at Models. In particular, we're going to use these View
Model things we just added to help make our Views more useful.

Say we wanted to add the ability to order more than one item at once, without
needing to repeatedly click the Order button. Let's see how one might do this
naïvely, without the use of Janus-like tools.

> We're going to take that Ordered item list display out for a moment just to
> cut down on the size of our samples. We'll add it back in later, and in the
> meantime we can tell that our code works by the Total amount.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
const ItemView = DomView.build( //! we add an <input/> here..
  $(`<div>
    <div class="name"/><div class="price"/>
    <label>Qty <input type="number" value="1"/></label> <button>Order</button>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item, view, dom) => {
      //! ..and this handler is rewritten to pull the input value.
      const order = view.closest_(Sale).subject.get_('order');
      for (let i = 0; i < parseInt(dom.find('input').val()); i++)
        order.add(item);
    })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order')
      .flatMap(list => list.flatMap(item => item.get('price')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

This isn't bad, but it's already a lot of homework, and a tight binding against
the structure of our HTML. If we wanted to, say, add a subtotal preview before
the items are actually added, we end up with a terrible mess.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
const ItemView = DomView.build(
  $(`<div>
    <div class="name"/><div class="price"/>
    <label>Qty <input type="number" value="1"/></label> <button>Order</button>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item, view, dom) => {
      const order = view.closest_(Sale).subject.get_('order');
      for (let i = 0; i < parseInt(dom.find('input').val()); i++)
        order.add(item);
    }),
    find('input').on('input change', (event, item, view, dom) => {
      //! here we do things an old-fashioned way: react to an event, and
      //  independently update everything that event should touch.
      const subtotal = parseInt(dom.find('input').val()) * item.get_('price');
      dom.find('button').text(`Order (${subtotal})`);
    })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order')
      .flatMap(list => list.flatMap(item => item.get('price')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

This is nasty. It's repetitive. It's fragile. It also doesn't work the way we'd
want: the subtotal doesn't show up until we change the order quantity. But because
the actual quantity we want to order isn't part of the `Item` model (nor should
it be; the `Item` just describes the item itself! we don't want to pollute it with
order information), we have no way to bind the quantity to the screen using our
usual `find`/`text`/`from` triplet.

> # Completely unrelated:
> If nest an `<input/>` inside a `<label>` like we do here, you don't need to do
> the whole dance with `id` and `for`! The more you know…

We need some additional space to store and compute values. This is exactly what
View Models are for; let's try this now:

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
const ItemOrderer = Model.build( //! we now actually provide some schema here:
  attribute('qty', class extends attribute.Number {
    initial() { return 1; }
  })
);
const ItemView = DomView.build(
  ItemOrderer,
  $(`<div>
    <div class="name"/><div class="price"/>
    <label class="qty">Qty <span/></label> <button/>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    //! here, we .render the attribute we declare above
    find('.qty span').render(from.vm().attribute('qty')),
    //! and everything to do with button updates a little in response.
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        const order = view.closest_(Sale).subject.get_('order');
        for (let i = 0; i < view.vm.get_('qty'); i++) order.add(item);
      })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order')
      .flatMap(list => list.flatMap(item => item.get('price')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

This is already visually much cleaner: we see that a lot of the nasty referencing
back and forth to the DOM is gone, and things like the computation of the subtotal
are much easier to glance at and understand.

But there are quite a few new elements at once here. Let's go through them now.

Maybe the simplest bit here is that you can chain mutators together, without having
to call `find` each time: `find('button').text(…).classed(…).on(…)` and so on.
A small but very pleasing shortcut.

Model Attributes
----------------

Next, let's take a look at all this `.vm()` and `.attribute()` business. We'll
begin with a simpler example.

~~~
const Thing = Model.build(
  attribute('name', attribute.Text)
);

const ThingView = DomView.build(
  $('<div/>'),
  find('div').render(from.attribute('name'))
);

const thing = new Thing();
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Thing, ThingView);
return [ app.view(thing), inspect.panel(thing) ];
~~~

Here, we find this `from.attribute` thing in isolation. We use it in this case
to get a Standard Library text editor on screen, but what is it and how does it
work?

For starters, let's imagine that we wanted a textbox for the `name`, so we write
`.render(from('name'))`. But as we now understand, `from('name')` will give us
a `Varying[String]` with the _value_ of the `name`. This might help us draw a
textbox initially, but whatever View handles the textbox won't have any way to
update the textbox when the value changes, or update the value when the textbox
changes.

We need some sort of artifact that we can pass around that represents not just
a value that happens to come from some particular place, or even a _changing_ value
that comes from some place, but rather the _place itself_. Here is some particular
slot, a data property on some model. It has this type; here's how you get or set
that value. Here are some other details, like the value it should initially have.

This is what `.attribute` does. You call it directly on a model:

~~~
const Thing = Model.build(attribute('name', attribute.Text));
const thing = new Thing();
const name = thing.attribute('name');

const app = new App();
stdlib.view($).registerWith(app.views);

return [
  inspect.panel(thing),
  app.view(name)
];
~~~

In truth, all `from.attribute()` does is provide a little shortcut. Behind the
scenes, it is equivalent to: `from.subject().map(subject => subject.attribute('name'))`.
This gets tiresome to write out, so we have the shortcut.

Quick Aside: The Enum Attribute
-------------------------------

While we are on the topic of attributes: most of the built-in Model attributes
are pretty straightforward, and are discussed at length both [in the API documentation](/api/attribute#text-attribute)
as well as over on the [theory side of things](/theory/maps-and-models#model-attributes).

But one worth discussing briefly is the Enum attribute.

~~~
// models:
class Item extends Model {};
const Sale = Model.build(
  attribute('shipping', class extends attribute.Enum {
    _values() { //! we implement this _values() method inline:
      return from('order').flatMap(order => order.length).map(l =>
        (l > 4) ? [ 'Big Freight', 'Fast Mail' ]
        : [ 'National Post', 'Big Freight', 'Fast Mail' ]);
    }
  })
);

// views:
const ItemOrderer = Model.build(
  attribute('qty', class extends attribute.Number {
    initial() { return 1; }
  })
);
const ItemView = DomView.build(
  ItemOrderer,
  $(`<div>
    <div class="name"/><div class="price"/>
    <label class="qty">Qty <span/></label> <button/>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('.qty span').render(from.vm().attribute('qty')),
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        const order = view.closest_(Sale).subject.get_('order');
        for (let i = 0; i < view.vm.get_('qty'); i++) order.add(item);
      })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order Total</h1> <div class="total"/>
    <h1>Shipping</h1><div class="shipping"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order')
      .flatMap(list => list.flatMap(item => item.get('price')).sum())),
    find('.shipping').render(from.attribute('shipping'))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

The Enum attribute has an overridable method `_values`, which is expected to return
one of `Array` or `List`. It can be given directly, or wrapped in a `from` expression
referencing other Model properties, as you see here, or it can be wrapped in a
`Varying`. In any case, the available options for the attribute will update as
necessary.

The values themselves need not be Strings. They can be any object type, as long
as you provide a `stringify` in the render `.options` in the case of a dropdown,
or an appropriate View in the case of a clickable List. You can see an example
of the latter [here](/theory/maps-and-models#attribute-editors), where we also
demonstrate the data modelling powers of locally-referenced Enum attributes.

Fancier From Expressions
------------------------

So far you've seen some basic `from` expressions that only reference a single value,
from a single source, and maybe stack a transformation. But what if you want to
deal with more than one value source at once?

Once again, we might attempt to do this naïvely, on our own.

~~~
const ThingView = DomView.build(
  $('<div/>'),
  find('div').text(from.subject().flatMap(subject =>
    Varying.all([ subject.get('x'), subject.get('y') ])
      .map((x, y) => x + y)))
);
const thing = new Map({ x: 2, y: 7 });

return [ inspect.panel(thing), new ThingView(thing) ];
~~~

And assuming you know that [`Varying.all`](/api/varying#@all) exists (or alternatively
[`Varying.mapAll`](/api/varying#@mapAll), or if you're feeling _really_ fancy
[`Varying.lift`](/api/varying#@lift)), you _could_ do things this way, but it's
really clunky.

We're not really using `from` at all. We aren't describing data and computation,
we're really just writing a function that takes in a very particular piece of
data and returns some other. `from` has a better answer.

~~~
const ThingView = DomView.build(
  $('<div/>'),
  find('div').text(from('x').and('y').all.map((x, y) => x + y))
);
const thing = new Map({ x: 2, y: 7 });

return [ inspect.panel(thing), new ThingView(thing) ];
~~~

Actually, let's simplify even further:

~~~
const Thing = Model.build(
  bind('z', from('x').and('y').all.map((x, y) => x + y))
);

return inspect.panel(new Thing({ x: 2, y: 7 }));
~~~

So we learn two things here, then. First, you can chain `.and` onto a `from` expression
to add additional terms. To gather all the terms together and compute some useful
single result from them, we use `.all` and then `.map`/`.flatMap`.

The other new bit here is that you can `bind` certain Model data properties to
one or more other properties on the same Model, using exactly the same `from` syntax
we've been using to compute bound values for View display.

> It may be confusing that `z` looks like it is a `Varying[Int]` in the debug panel,
> but this is just how we present the binding information so that you can inspect
> the binding computation itself, by hovering over the word `Varying`. Try it!

The last thing we need to learn to understand our earlier sample: how do we reference
the View Model from the View, once we've created it? Or vice versa?

~~~
const pi = Math.PI;
const Geometries = Model.build(
  bind('radius', from.subject('diameter').map(d => d / 2)),
  bind('area', from('radius').map(r => pi * r * r))
);

const CircleView = DomView.build(
  Geometries,
  $(`
    <p>The given diameter is <span class="diameter"/>. <button>Halve</button></p>
    <p>The radius is therefore <span class="radius"/>.</p>
    <p>This results in an area of <span class="area"/>.</p>
  `),
  template(
    find('.diameter').text(from('diameter')),
    find('.radius').text(from('diameter').and.vm('radius')
      .all.map((d, r) => `${d} / 2 = ${r}`)),
    find('.area').text(from.vm('radius').and.vm('area')
      .all.map((r, a) => `π${r}² = ${a}`)),

    find('button').on('click', (event, circle, view) => {
      circle.set('diameter', view.vm.get_('radius'));
    })
  )
);

return new CircleView(new Map({ diameter: 4 }));
~~~

So, this is a bit contrived. There's no reason to use a View Model here, and using
the computed radius to halve the diameter is cute but silly. It does, however,
demonstrate the two key points very cleanly.

From the View, you can use `from.vm` or `.and.vm` to reference the View Model rather
than the Subject Model. And if you have the view instance, like we do in the `.on`
handler, you can find the View Model on its `.vm` instance property.

Conversely, when we are working within the View Model definition, our `from` expressions
naturally reference local data properties within the View Model. If we want to
reference the Subject Model, we need to use `from.subject`.

> # Aside
> Something we emphasize more heavily over on the theory side of things is the
> idea that using Model `bind`ings, you can express really complex multi-input
> computations piecemeal, without having to worry about when each value might
> update.
>
> In this way, you can think of Models and especially View Models not as bags of
> data, but rather as problem-solving spaces.
>
> You can see an example demonstrating this principle [over there](/theory/maps-and-models#model-bindings).

Putting It All Together
=======================

You should now be able to look at that sample again, now with the ordered item
list restored, and understand it completely.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

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
    find('.qty span').render(from.vm().attribute('qty')),
    find('button')
      .text(from.vm('qty').and('price')
        .all.map((qty, price) => `Order (${qty * price})`))
      .on('click', (event, item, view, dom) => {
        const order = view.closest_(Sale).subject.get_('order');
        for (let i = 0; i < view.vm.get_('qty'); i++) order.add(item);
      })
  )
);

const ItemView = DomView.build(
  $('<div><div class="name"/><div class="price"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price'))
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory'))
      .options({ renderItem: (item => item.context('orderer')) }),
    find('.order').render(from('order')),
    find('.total').text(from('order')
      .flatMap(list => list.flatMap(item => item.get('price')).sum()))
  )
);

// data:
const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

// application assembly:
const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Item, ItemOrdererView, { context: 'orderer' });
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

Hopefully something you notice here is that practical Janus code is _very declarative_.
There is little of the usual step-by-step shuffling and homework in here. If you
scan this code, there is one block that stands out from all the rest: the `.on`
handler for the button.

The bulk of the code here is declarative: we are formulating rules that Janus will
maintain for us. We are describing the relationships between things: data and data,
data and the screen. Often, problem-solving in Janus does not involve programming
so much as it involves data modelling.

Recap
=====

Here, we made actual use of the View Models we introduced in the previous chapter.
As part of that, we learned more about how `from` expressions work, and started
looking at Models:

* We introduced Model attributes, which encode metaproperties about a Model data
  property like its type, initial value, and other information we'll cover later.
* We introduced Model `bind()`, which allows certain data properties to be defined
  as a computation on other data on the same Model.
* We learned about `.and` and `.all`, which allow the combination of multiple
  source values as part of a `from` expression.
* As part of the above, we learned about additional `from` contexts, like `from.subject`,
  `from.attribute`, and `from.vm`.

Next Up
=======

We haven't covered all there is to know about Views. There are some aspects that
you can learn about pretty quickly by referencing the documentation:

* There are many mutators available besides `.text` and `.render`. `.classed`,
  `.classGroup`, `.attr`, `.css`, and others are [all available](/api/dom-view#mutators).
* Sometimes `.on` doesn't really cut it. In these cases, you can override the
  [`_wireEvents`](/api/dom-view#_wireEvents) method to implement your own directly.

And, there are some advanced capabilities that you might never need:

* You can always create [your own mutators](/theory/views-templates-mutators#bring-your-own-mutators)
  and teach them to Janus if there's anything more you need.
* Sometimes direct mutator binding won't do what you need, performantly or at all.
  In these cases, you might want to [render the View yourself](/further-reading/view-custom-render).
* Janus allows you to render markup server-side, then pick the same markup back
  up on the client and reanimate it without redrawing everything. This is done
  through [`attach()`](/further-reading/view-attach).

For the most part, we have touched on most of what you should need to author Views
in Janus. Because this is a practical guide motivated by pushing our sample code
forward, we haven't done this coverage in a particularly systematic way. If you're
feeling like you want a more concrete description of Views, you should check out
the [theory-oriented chapter](/theory/views-templates-mutators) on this topic.

In the next chapter, we are going to continue to build on what we've done here,
adding some new features that will make use of [`Map` and `Model`
features](/hands-on/maps-and-models) you haven't yet seen.

