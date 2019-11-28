Shoring Up the Basics
=====================

Here, we are going to revisit the sample point-of-sale application we started
writing in the [Getting Started guide](/intro/getting-started). If you haven't
read that chapter yet, it's probably a good idea to do that now.

Looking at that code again, then, let's improve it so that the user can actually
see what they've ordered.

~~~
// models:
class Item extends Model {};
class Sale extends Model {};

// views:
const ItemView = DomView.build($(`
  <div class="item">
    <div class="name"/><div class="price"/> <button>Order</button>
  </div>`),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { sale.get_('order').add(item); })
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

const view = app.view(sale);
view.wireEvents();
return view;
~~~
~~~ styles
.order .item button { display: none; }
~~~

We barely changed our sample: we made the sample-simplifying changes we promised
in the previous section, and we added some markup for Orders. We then populated
that new `.order` element with `find('.order').render(from('order'))`.

> Wait, why doesn't the Order listing have buttons? Maybe you have a guess, but
> we will get back to this question in just a moment.

Because we didn't dive very deeply into this code in the Getting Started chapter,
though, let's do a little bit of that right now.

Rendering Lists
---------------

First, we have our Models. Right now, we haven't actually done anything with them:
we just `extend Model` so that we have distinct classes for our different Models.
This is important because the classtype is how Janus (or, more accurately, the
Janus `App`) understands what to do when you ask for an object to be `.render`ed.

So when we say, "please `find` the element `.inventory` and `.render` the value
`from('inventory')` from my data value," the DomView will pull up the subject data
associated with the View, which in this case is the `sale`. Next, it will look at
the `inventory` property on that Model, where it will find the inventory `List`
data we create by hand. So the DomView knows we want to `.render` that `List`—it
accomplishes this by asking the `App`lication context. The `App` looks at its `.view`
Library and asks it if it knows about `List` classes. The `Library` has been taught
that `List` classes are associated with `ListView`s, and returns a `ListView` (this
happens when we register the `stdlib.view` with our `app`). A new `ListView` is
created, with our `inventory` List as its subject, and the cycle repeats anew.

> # Aside
> If you would like to learn more about how the `from` system works to resolve
> references to data properties, you can read the [theory chapter](/theory/from-expressions)
> on that subject. There is also [a chapter](/theory/app-and-applications)
> discussing the steps performed by `App` when you ask it for a view.

There is a lot of this sort of thing in Janus: different components working together,
bringing together contextual information in different steps to accomplish a task.
Because there is no big central brain controlling all these steps, you will eventually
see that you can alter these procedures as you see fit.

Next, it is probably useful to convince yourself that you understand how the Order
information we added makes its way onto the page. The story we just wove about
`inventory` should be helpful, here.

At some point while thinking about that (you really did give it a go, right?),
you might get back to the question: how is it that the Order buttons don't show
up the second time around? They're clearly part of the `ItemView` that we are
clearly rendering!

The answer is "easy": we do it in CSS. In the stylesheets, we add a rule that asks
for `.order .item button { display: none; }`, and so the buttons just don't appear
in that particular context. This sort of trick is extremely useful in Janus: there
are a lot of typical JS framework patterns that we don't explicitly support in
Janus, like hiding/showing a block of markup based on some set of conditional logic,
because we think the browser already provides a great tool to do this kind of work:
set state using HTML classes, and use CSS to actually transform the _presentation_
of your application to suit that state.

Maybe this doesn't sit well with you. "Perhaps," you might think, "but what if
we want the Inventory list and the Order list to do different things entirely?"
We will get there very quickly, and demonstrate several ways to pet that cat. First,
let's finish talking through our sample.

Displaying the Order Total
--------------------------

The last really major thing we do is render the total order cost:

~~~ noexec
find('.total').text(from('order').flatMap(list => list.flatMap(item => item.get('price')).sum()))
~~~

Once again, step-by-step: we want to `find` the `.total` element, and put some
`text` in it. The data for that text comes from the `order` data property on our
DomView subject Model. Like before, that subject is our `sale` model, and the
DomView finds a `List` object once it's looked up that `order` property. This
time, though, we do something a little different.

We are trying to describe a blob of text to put into the document, and a `List`
is not a blob of text. Somehow, we want to get the price of each item in the list,
and then sum them all together.

If we had a plain `Array` in hand, we would begin by `map`ping over it to get an
array of numbers. But this isn't quite what we see in the sample. First, we see
`flatMap` rather than `map`. Additionally, we see two maps, not one. What's going
on?

Let's start by taking a look at a simpler case.

~~~
const dog = new Model({ name: 'Gadget' });
const DogView = DomView.build(
  $('<div/>'),
  find('div').text(from('name').map(name => `hello, ${name}!`))
);
return new DogView(dog);
~~~

> Observant readers might note that we didn't bother calling `template` this time.
> `template` is not magic: its only real job is to bundle together a bunch of
> `find` calls. When you are only `find`ing one element, you can just use `find`.
> How this works is discussed in further detail [here](/theory/views-templates-mutators#templates).

Here, we build a little greeting based on a `name` property. But even though we
aren't dealing with any arrays here, we still see a `.map`. What gives?

Janus is really interested in a few basic principles, two of which you are seeing
here. The first is that Janus should be good at dealing with changes to your data
over time. If the `name` changes, so should the greeting. The second is that we
really dislike magicks in Janus. We don't like big machines whirring mysteriously
away, we don't like automatic processes you lack control over.

So in Janus, we have one very important data structure, one very important class
that represents a single value that can change over time. That class, `Varying`,
is the tiniest building block in Janus. We don't hide it away from you: you are
free to create, manipulate, and consume Varying objects however best suits you.
Each Varying contains a single value. You can retrieve the value using `.get()`:

~~~
const v = new Varying(42);
return v.get();
~~~

But this leaves us back where we started: we only know what the value of `v` was
at some particular point in time, at the moment we call `.get()`. We might as well
just use a variable. This is where mapping comes in.

~~~
const v = new Varying(42);
const doubled = v.map(x => x * 2);
v.set(12);
return doubled.get();
~~~

We still end up calling `.get()` in the end, but in the meantime we have this `doubled`
thing that somehow represents the concept of computing "the value of v `* 2`."
We change `v` without informing `doubled` of this fact, and when we ask `doubled`
what its value is, it already knows.

This is exactly what's happening in our dog greeting sample above. Many, many methods
in Janus return Varying values; `from` is (sort of) one of them. Given a Varying
that contains the name of a dog, we want to `map` that name—transform it—by
adding `hello, ` to it. Now, whenever the name of the dog changes, our greeting
changes.

So, this explains why we are mapping _twice_ when we try to compute the order total.
The first map is actually mapping over the object that is the List itself, so that
if some reason the `order` property on the `sale` gets replaced by some other List
instance, we know what to do with it. The second map is the one we'd expect: it
maps over the elements of the List to get a price for each one (`item => item.get('price')`).

But what's the deal with `flatMap`?

~~~
const v = new Varying(new List([ 4, 8, 15, 16, 23, 42 ]));
const vlen = v.map(list => list.length);
return inspect(vlen);
~~~

> We use `inspect` here, which is available throughout the Janus documentation,
> to get debugging information about a value.

Here, we have a `Varying[List]`, so we have a reference to a List but we might
end up pointing at some other List at some point. What we really wanted was to
end up with a `Varying[Int]`, with `vlen` indicating the length of the List. Instead,
we ended up with a `Varying[Varying[Int]]`. This sort of makes sense, because
[`list.length`](/api/list#length) returns a `Varying[Int]`:

~~~
const l = new List([ 4, 8, 15, 16, 23, 42 ]);
return [ inspect(l.length), inspect(l.length_) ];
~~~

> We use this convention a lot: appending an underscore to methods and functions
> that return `Varying`s will instead return the immediate value.

This means that in the above `v.map(list => list.length)` we provided a function
that gives `List => Varying[Int]`, and so if we swap out the `List` in `Varying[List]`,
we do indeed end up with a weird nested structure.

This is what `flatMap` is for. In Janus, `flatMap` _always_ means "the result of
the mapping function _might_ be a `Varying[T]` rather than a `T`, and if so you
should knock it down so I don't end up with nested Varyings."

~~~
const v = new Varying(new List([ 4, 8, 15, 16, 23, 42 ]));
const vlen = v.flatMap(list => list.length);
return inspect(vlen);
~~~

This nomenclature applies even when working with structures like Lists which might
have something like a `flatMap` on their own: we _always_ just mean "flatten Varyings."

~~~
const v = new Varying(new List([ new Model({ x: 2 }), new Model({ x: 4 }) ]));
const xs = v.map(list => list.flatMap(model => model.get('x')));
return inspect(xs);
~~~

Notice that in this case, we didn't `flatMap` the outer map. When we were trying
to determine the length of the List, we wrote a mapping function `List => Varying[Int]`.
But this time, by calling [`list.flatMap`](/api/list#flatMap), we have written
a mapping function `List => List`. So in this case, there is no Varying to flatten.
But if you get overzealous and ask for a `flatMap` anyway, Janus will just ignore
it:

~~~
const v = new Varying(new List([ new Model({ x: 2 }), new Model({ x: 4 }) ]));
const xs = v.flatMap(list => list.flatMap(model => model.get('x')));
return inspect(xs);
~~~

So now we can come back around and make sense of this line:

~~~ noexec
find('.total').text(from('order').flatMap(list => list.flatMap(item => item.get('price')).sum()))
~~~

Once we have our `order` List in hand, we map that List to a new List, with each
item (each `Item`) mapped to a `Varying[Int]`. (Once again, [`model.get`](/api/model#get)
gets you a Varying, [`model.get_`](/api/model#get_) gets you the value immediately.)
Because we end up with a Varying, we need to use `flatMap` while mapping the List.
Once we have that `List[Int]`, we can just call [`.sum`](/api/list#sum) to get
the `Varying[Int]` that represents the order total. In turn, because _that_ result
is a Varying, we need to `flatMap` it.

Gluing It All Together
----------------------

Last, we have the code that puts it all together.

~~~ noexec
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

We have some dummy data that we declare statically. Later we'll learn some ways
to retrieve this data using Janus tools.

Then, we create a new `App`. Apps are the primary context carrier in Janus: they
bind your whole application together with information about available Views, global
properties, and some other things we'll cover much later. This is true internally
as well: Janus is a collection of very independent and modular components that
so happen to combine well in different ways to solve the problem of interactive
user interfaces; App is the one place where we try to sequester all the "magic,"
where one component understands and expects and assembles an orchestra of other
components.

In this case, we use App only to provide context on which Views to use to `.render`
which objects. First, we register the Janus Standard Library views: the most useful
of these is the `ListView` we use here to draw a List, but there are many others.
There is nothing special or particular about the syntax used to do this; it's just
how the Standard Library does it.

After that, we individually [`.register`](/api/library#register) our two Views,
the `ItemView` and the `SaleView`. When we call `app.views`, this gives us a Library
instance. This reference is just a shorthand: really, App is a Model, and the `.views`
Library is a data property of the App just like `name` and `price` are data properties
of our `Items`. You could also get (or set) the View Library using the standard
Model methods: `app.get_('views')`, for example.

Last, we ask the App to give us an appropriate View for our `sale` object. Because
we have taught the View Library that SaleViews are great for Sales, that's what
the App will initialize, set up, and return to us. We have to call [`.wireEvents`](/api/dom-view#wireEvents)
to activate client-side interactivity (the button `.on` handler we declared is
useless in a server-rendering context, so we don't want to run that code unless
we have to). Finally, we return the `view` as our result.

One Last Thing
==============

We've been cheating this entire time. You may have spotted it. When we handle the
Order button click, we just directly manipulate the `sale` object as if it'll
always be there. Of course, this would not be the case in a real application,
especially if the Item code lives in, for example, `/your-project/src/views/item.js`.

You could solve this by manually passing the `Sale` context into the child Views,
allowing access to that reference. But this is frustrating homework to have to do.

Instead, we can use View Navigation to solve this problem. Let's look at a simplified
example.

~~~
class Item extends Model {};
class Sale extends Model {};

const ItemView = DomView.build(
  $('<button/>'),
  find('button')
    .text(from('name'))
    .on('click', (event, subject, view) => {
      view.closest_(Sale).subject.get_('order').add(subject);
    })
);

const SaleView = DomView.build(
  $('<div><div class="inventory"/><div class="order"/></div>'),
  template(
    find('.inventory').render(from('inventory')),
    find('.order').text(from('order')
      .flatMap(order => order.flatMap(item => item.get('name')).join(', ')))
  )
);

const inventory = new List([
  new Item({ name: 'Green Potion', price: 60 }),
  new Item({ name: 'Red Potion', price: 120 }),
  new Item({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Item, ItemView);
app.views.register(Sale, SaleView);

const view = app.view(sale);
view.wireEvents();
return view;
~~~

View Navigation allows you to reason about the tree of Views you have drawn on
the page. You can navigate in or out: `.into` and `.into_` will move one level
toward the leaves, while `.closest`, `.parent`, and their underscored counterparts
move towards the root.

The navigation is done using a selector system. You do not have to provide a selector
at all in some cases, like `.parent`. But there are a variety of ways you can limit
your navigation search by providing a selector: in this example, we have used the
Subject Model classtype as our descriptor; we could also have used the View classtype,
or in some cases a data key name.

> You can find a detailed description of the navigation methods and selectors in
> the [API documentation](/api/views#navigation).

When you navigate the tree of Views, you will always get back a View instance as
the result. All Views store their subject at the `.subject` property, so we use
that to fetch the actual `Sale` once we have a `SaleView` in hand.

> # Exercise
> Now that you understand View Navigation, return to the sample at the start of
> this chapter, and amend it so that it doesn't depend on `sale` being available
> in the local closure scope.
>
> The samples on the next page will stop cheating and use navigation instead, so
> if you aren't sure about your solution, you can always move on and check.

Recap
=====

In this chapter, we reëxamined our sample code and talked through the concepts
in detail.

* We learned how our template declarations are translated into the things you see
  on screen:
  * When a `from('property')` expression is processed, the relevant `property`
    is found and its value retrieved.
  * But it is not retrieved as a value at a point in time, but rather a `Varying`
    wrapper _around_ that value.
  * That wrapper lets us describe operations on top of the value itself using `.map`,
    so that we don't have to worry about the value changing.
  * But if our mapping operation _also_ returns a `Varying` as its result, we want
    to `.flatMap` rather than `.map`. It's okay if we `.flatMap` when we didn't
    need to.
  * In the case that we are `.render`ing something, the final result of our data
    reference and transformation is used to look up an appropriate View classtype
    using the `.views` Library within our App.

Next Up
=======

Those of you who were unhappy with using CSS to hide the buttons for the order
listing will be pleased: our [next chapter](/hands-on/views-too) will explore
other ways of accomplishing the same task, as part of learning about View Models,
how they're useful, and different ways to go about implementing them.

