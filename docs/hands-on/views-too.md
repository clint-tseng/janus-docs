Views, View Models, and You
===========================

In this chapter, we are going to build on the [understanding we formed](/hands-on/shoring-up-basics)
in the previous chapter to explore some new techniques for working with Views.

You'll recall from that chapter that we added one feature: a list of the items
that have been ordered. We did this by reusing the `ItemView` we'd already created,
and using CSS to hide the Order button to end up with a static list.

We will frame this chapter by exploring some alternative ways we could have accomplished
the same task, and in some cases add some functionality.

Reusing Template Bindings
-------------------------

First, we will take the perhaps obvious approach of creating two different Views.
Let's see what this might look like in a reduced example:

~~~
class Item extends Model {};

const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { /* do nothing for now */ })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price'))
  )
);

const item = new Item({ name: 'Blue Potion', price: 160 });

return [
  new ItemOrderingView(item),
  new ItemSummaryView(item)
];
~~~

So, this works. We have two different Views that we'll be able to use independently;
we'll get to how in just a moment. But it's also kind of lame. We've repeated a
lot of bindings for no very good reason at all. It would be really nice if we could
share them across the two Views.

~~~
class Item extends Model {};

const basicItemBindings = template(
  find('.name').text(from('name')),
  find('.price').text(from('price'))
);

const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    basicItemBindings,
    find('button').on('click', (event, item) => { /* do nothing for now */ })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  basicItemBindings
);

const item = new Item({ name: 'Blue Potion', price: 160 });

return [
  new ItemOrderingView(item),
  new ItemSummaryView(item)
];
~~~

Better! Janus code doesn't tend to carry magic context: it never really matters
where you define things. You don't have to define template bindings only in the
scope of a View or a `template`.

You might also recall from the previous chapter our offhand comment about `template`s
being little more than a way to group many `find` statements together. A result
of this is that `template()` and `find()` result in the same type of object (a
function, actually). That, in turn, means that you can nest `template`s inside
of `template`s just like `find`s can be inside of `template`s.

But this still isn't all that great. Now when we look at these Views, we have to
search around the file to locate this other binding thing, which could sort of
be anywhere. It would be nice if there were a way to reuse bindings without breaking
them out of line.

~~~
class Item extends Model {};

const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    template('basic',
      find('.name').text(from('name')),
      find('.price').text(from('price'))
    ),
    find('button').on('click', (event, item) => { /* do nothing for now */ })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  ItemOrderingView.template.basic
);

const item = new Item({ name: 'Blue Potion', price: 160 });

return [
  new ItemOrderingView(item),
  new ItemSummaryView(item)
];
~~~

Also better! We can name the template by passing in a string, then reference the
named template out of the View we create. This works even if the template is nested
several levels deep.

Depending on how you like your code structured, and the particular situation you're
in, this can be a far more fluent way to reuse template bindings across your code.

Next, we'd like to apply this new technique in the context of our original full
sample, but we run into a problem. We only have one `Item` model type, but now
we have two different Views we might want to use with an `Item` depending on the
context.

We only have one `.register` method, so how do we do this?

~~~
class Item extends Model {};

const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    template('basic',
      find('.name').text(from('name')),
      find('.price').text(from('price'))
    ),
    find('button').on('click', (event, item) => { /* do nothing for now */ })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  ItemOrderingView.template.basic
);

const item = new Item({ name: 'Blue Potion', price: 160 });

const app = new App();
app.views.register(Item, ItemOrderingView);
app.views.register(Item, ItemSummaryView, { context: 'summary' });

return [
  app.view(item),
  app.view(item, { context: 'summary' })
];
~~~

So when we `.register` a View for a Model classtype, we can optionally provide
some particular `context` for it. When we then ask for a view back from the App,
we can specify some particular context we are interested in.

> # Aside
> Two things to note.
>
> First, Libraries in general are not actually particular to Views and Models;
> they are a general tool for associating resources with a classtype, as we will
> see more of later.
>
> Also, in addition to the `context` you can specify additional arbitrary criteria
> properties to describe and request Views with. You can read more about this in
> the [theory section on Libraries](/theory/app-and-applications#the-library).

Usually, though, we won't be calling `app.view` to get a View, except at the very
root of our application. How do we specify a desired context if we are trying to
describe a `.render` in a template?

~~~
class Item extends Model {};
class Container extends Model {};

const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    template('basic',
      find('.name').text(from('name')),
      find('.price').text(from('price'))
    ),
    find('button').on('click', (event, item) => { /* do nothing for now */ })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  ItemOrderingView.template.basic
);

const ContainerView = DomView.build(
  $('<div><div class="ordering"/><div class="summary"/></div>'),
  template(
    find('.ordering').render(from('item')),
    find('.summary').render(from('item'))
      .context('summary')
  )
);

const item = new Item({ name: 'Blue Potion', price: 160 });
const container = new Container({ item });

const app = new App();
app.views.register(Item, ItemOrderingView);
app.views.register(Item, ItemSummaryView, { context: 'summary' });
app.views.register(Container, ContainerView);

return app.view(container);
~~~

So we can actually chain this `.context` call onto a `.render` call, and that way
we can specify a context we are interested in.

> # Aside
> Once again, two things to note.
>
> One, you can provide a `from()` expression to the `.context` call just as you
> can for `.render`, so the desired context can be computed based on some data.
>
> Two, `.context` is not the only chainable call on `.render`. You can read about
> the others in the [API Documentation](/api/dom-view#render). You can also learn
> a lot more about child views and `.render` in the [related theory section](/theory/views-templates-mutators#child-views).

Now all that's left is to actually use these separate Views in the context of our
original full sample.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
const ItemOrderingView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    template('basic',
      find('.name').text(from('name')),
      find('.price').text(from('price'))
    ),
    find('button').on('click', (event, item) => { sale.get_('order').add(item); })
  )
);
const ItemSummaryView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/>
  </div>`),
  ItemOrderingView.template.basic
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"/>
    <h1>Order</h1> <div class="order"/>
    <h1>Order Total</h1> <div class="total"/>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.order').render(from('order'))
      .options({ renderItem: (item => item.context('summary')) }),
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
app.views.register(Item, ItemOrderingView);
app.views.register(Item, ItemSummaryView, { context: 'summary' });
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

Here, we have to use one of those other chained calls off `.render`: `.options`.
If we were to specify `.context('summary')` directly off of `.render(from('order'))`,
we would be asking for the summary context view of the _List_, not each item _in_
the List.

Instead, List lets us pass in a little mini-chain through its `.options`. Options
are a simple, open-ended way to pass configuration to components, much like you
would have with an old jQuery plugin. In this case, we are configuring the List
to specify how it should internally `.render` each item it tries to draw.

~~~ noexec
.options({ renderItem: (item => item.context('summary')) })
~~~

Because the way you'd normally express these things (the options, the context,
and so on) involves chaining calls together, the Standard Library ListView tries 
to stay as close to that syntax as possible. So you get passed an object that you
can chain calls onto as if you'd just called `.render`. As you may suspect, you
could also chain `.options` and so on onto `item` in the snippet above.

> `.options` will _also_ take a `from` expression if you'd like.

So, that is one way to pet this cat. We can take advantage of template reuse to
create two separate Views. We can register two Views against the same Model classtype
by specifying some context in which to use each. We can then request some particular
context when drawing a View.

How else might we do this?

View Models in Longhand
-----------------------

Janus is more of an MVVM framework than an MVC framework. Because data is bound
very directly from Models onto Views, and View event handlers usually just directly
manipulate the Models, there is not much of a need for any Controllers in Janus
code. There's nothing stopping you from trying, of course!

On the other hand, there is often a need to store and compute data that isn't really
part of the Model at hand. You might have an object on screen that can get collapsed
and expanded, for example, in which case you have an extra Boolean you need to
store somewhere. Ideally, you wouldn't want to put it on the data object, because
it's not really actually a property of that data—it's just some interface concern.

Similarly, you might be drawing a data element as part of a chart, and need to
repeatedly reference some computed number that has been scaled appropriately for
the screen. It would be both really annoying and computationally inefficient to
have to write out that arithmetic each time it was needed.

This is what View Models are for: you can bind their data onto the screen and push
changes into them like any Model; they are useful by the convention that they
contain data internally useful for handling the user interface, rather than "canonical"
data describing business objects.

Let's start there: by creating a View Model concept entirely by convention.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// viewmodels:
class ItemOrderer extends Model {};

// views:
const ItemOrdererView = DomView.build(
  $('<div><div class="info"/> <button>Order</button></div>'),
  template(
    find('.info').render(from('item')),
    find('button').on('click', (event, orderer) => {
      sale.get_('order').add(orderer.get_('item'));
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
    find('.inventory').render(from('inventory')
      .map(items => items.map(item => new ItemOrderer({ item })))),
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
app.views.register(Sale, SaleView);
app.views.register(ItemOrderer, ItemOrdererView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

We create a new Model class `ItemOrderer` which _wraps_ an `Item`. We store the
Item at `item`, and this way we just have an `ItemOrdererView` which draws an `ItemView`
inside of it, and handles the button particulars.

What you'll probably find is that this kind of wrapping homework gets tiring quickly.
Any time you want to reference the Item within the Orderer View, you need to first
go get the the View Model, then `.get_('item')` to actually get the Item itself.
Any time you want to draw an Item with an ItemOrdererView, you have to do the whole
mapping exercise yourself to wrap the Item Model with the ItemOrderer View Model.

Once or twice? Sure. And it's nice not to have to muck about with contexts like
we did earlier. But go through this exercise enough times, get some subtle piece
of boilerplate wrong enough times, and it'll get annoying. Janus provides some
tools to help you out here.

View Models in Shorthand
------------------------

You can have Janus do the View Model homework for you by declaring it as part of
your View:

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
class ItemOrderer extends Model {};
const ItemOrdererView = DomView.build(
  ItemOrderer,
  $('<div><div class="info"/> <button>Order</button></div>'),
  template(
    find('.info').render(from.subject()),
    find('button').on('click', (event, item) => { sale.get_('order').add(item); })
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

Some subtle things have changed here.

First, to signal that we wish to use a particular View Model class with a View,
we provide a reference to the class as the first parameter to `DomView.build`.
Now, any time we instantiate the View, it will automatically initialize an `ItemOrderer`
instance, with a [number of pre-populated data values](/api/view#@viewModelClass):
the true View subject, which can be found at `subject`, the View options at `options`,
and the View instance itself at `view`.

Second: as with our original example, and in contrast to our self-rigged View Model
system we just looked at, when we receive our subject in our `.on` click handler,
we get the true original subject of the View.

In general, this is the primary benefit of using this method: the subject stays
the subject. If you already wrote a bunch of View code for a Model, and _then_ decide
that you need a View Model to handle some things, you don't have to do a bunch of
nasty clerical work hunting down all your references and repointing them to some
newly-wrapped data property.

You see this also when we render the `ItemView` within our orderer view: we use
`from.subject()`, which references the subject itself. This reference will get you
the same true subject whether or not there is a View Model involved (try it!).

> # Aside
> Wait, `from.subject()`? What even is that?
>
> `from` expressions are a generic and reconfigurable tool for describing pieces
> of data without concretely referencing them. There is [a default set](/api/from#{x})
> of different cases like `subject` you can use (like `app` to reference the context
> `App`), or you can even replace that set with your own if you'd like.
>
> You can learn more about `from` expressions in depth over on the [theory side
> of things](/theory/from-expressions).

Also as a result of this, when we `.register` our View against a subject Model,
we do so against a plain `Item`. The `Item` is the subject.

On the flip side, we're back to having to deal with `context`s to distinguish between
the two Views we might want on screen.

Hey! You Could Have Just Done This Whole Thing With Context!
------------------------------------------------------------

Yes, you're right. We could have. In the next chapter, we will add some functionality
that leverages the presence of the View Model. For now, we just wanted to explore
_what_ a View Model is, and _how_ you might go about establishing one.

Recap
=====

In this chapter, we learned some ways to reuse our template declarations:

* We learned how to break out of the mould, and freely move our `template()` and
  `find()` declarations around to wherever suited us best. This helped us with
  reusing template declarations.
* We took a peek at named templates, when we _don't_ want to break any of our
  declarations out of their natural home, but we still want to reuse some of them
  elsewhere.

Somewhat separately, we began to think about View Models and different ways to
create them:

* By convention, ourselves, without Janus's help, we can simply wrap Models in
  other Models to create a different data context.
* Using Janus's tools, we can accomplish the same thing implicitly, in a manner
  that often reduces the amount of rewiring and homework required.

Next Up
=======

As mentioned, in the [next chapter](/hands-on/views-to-models) we will
actually discuss _why_ you'd want to create View Models, and see how they can
help us solve interface-related problems just by creating some additional space
to work with.

