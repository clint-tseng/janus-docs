Trying It Out
=============

If you just want to throw some things together, or see how the samples in this
documentation work if you change a thing here or there, you can use the console
at the top of the page, or directly modify the code of any embedded code samples.

You can also take the result of any code sample and import it into the console
to play with it further.

Starting a Janus Application
============================

Janus is shipped exclusively over NPM. Add `janus` as a dependency to your
`package.json` file (you can find the latest version in the header above), or
run `npm install --save-prod janus` to have it automatically inserted.

To import the Janus [Standard Library](/api/stdlib) as well, which provides
useful, generic implementations for common needs like List Views, you will need
to add it as well as a shim to feed it your DOM manipulation library of choice.

1. Add `janus-stdlib` to your `package.json` file. You can find the current version
   in the header above, or run `npm install --save-prod janus-stdlib`.
2. Add a library `janus-dollar` to your `package.json` file.
   * Instead of a version, you will need to point it directly at this URL:
     `git+https://github.com/clint-tseng/janus-dollar-jquery`.
   * You can alternatively run `npm install --save-prod janus-dollar git+https://github.com/clint-tseng/janus-dollar-jquery`.

Once you are done, you should end up with a `package.json` that looks something
like:

~~~ noexec
{
  …,
  "dependencies": {
    "janus": "~0",
    "janus-stdlib": "~0",
    "janus-dollar": "git+https://github.com/clint-tseng/janus-dollar-jquery"
  }
}
~~~

Running in a Browser
--------------------

Applications that need to run client-side will also need some way to boil the code
down for the web browser&mdash;the `require()` statements won't work directly.
[Browserify](http://browserify.org/) is probably the easiest to use; just run
`browserify yourfile.js` and it'll work its magic. But all the usual suspects are
fine: if you prefer [requirejs](https://requirejs.org/) or [webpack](https://webpack.js.org/),
that's great. Anything that converts CommonJS and NPM for the browser will fit
the bill.

The rest of this getting started guide will provide Browserify instructions. If
you don't have it already, run `npm install -g browserify` to grab a copy.

Your First Janus Application
============================

Now that you have Janus installed, let's throw something useful together just so
that you can feel your way around a little bit. We will start building a little
point-of-sale application here, and continue with it in the [Practical Guide](/hands-on)
section.

Take your time with each of these code examples and make sure you feel like you
understand the gist behind each line before moving on.

Printing Some Text
------------------

First, we'll have to create an HTML file to house the application. Create a new
file `index.html`, and add something like this; the important parts are the
`<script>` tag and the `<div id="main">`.

~~~ html
<!doctype html>
<html>
  <body>
    <div id="main"></div>
    <script src="app.js"></script>
  </body>
</html>
~~~

So now we'll have to create that `app.js` file. Because we'll be transforming the
code for the browser, we'll actually name our source file `client.js`, and then
generate `app.js` from it. Create that file, and let's just get some basic components
working to make sure everything is glued together right.

~~~ noexec
const $ = require('jquery');
const { Map, DomView, template, find, from } = require('janus');

const ItemView = DomView.build(
  $('<div><div class="name"/><div class="price"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price'))
  )
);

const item = new Map({ name: 'Red Potion', price: 120 });
const view = new ItemView(item);
$('#main').append(view.artifact());
~~~

As you can see, we require some tools from Janus, make an item for our shop to
sell, and make a simple view that just tells us what it is and how much it costs.
The template syntax selects each element we are interested in from the HTML
fragment, and assigns it a text `from` some properties we care about. We then
instantiate one of these views, and add it to the document.

Run `browserify client.js > app.js` and you should now have a working initial
application. If you run into trouble with this command, double-check that your
`package.json` looks right, as shown in the previous section, and try running
`npm install` again just in case.

You should, when you open the HTML page in a browser, see &ldquo;Red Potion120&rdquo;
on screen. That may not seem very exciting, but think about what we've just done:
we've described how any piece of data of some particular shape should be displayed
in our interface, and fed it some random piece of data to show&mdash;and it worked!

> # Aside
Eagle-eyed observers may notice that `app.js` is somewhat large. This is because
Browserify tries to include `domino`, which we need server-side but not on the
client. Adding `--exclude domino` to the command will slim up the file by a lot.

A Little Bit of Organization
----------------------------

Before we take our next main step, we're going to stop for a moment and reorganize
what we've already done a little bit. It's great that we can just feed any ol'
`Map` to a `View` and have it render attributes, but it would be nicer if we had
some real `Model` to represent each item.

And it's great that we can just render a `View` at whim and use it however we'd
like, but it would be nicer if somehow the application just knew how items should
be rendered. This will especially become important when we start nesting `View`s
together.

So, let's make those two changes now:

~~~ noexec
const $ = require('jquery');
const { Model, DomView, template, find, from, App } = require('janus');

class Item extends Model {};

const ItemView = DomView.build(
  $('<div><div class="name"/><div class="price"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price'))
  )
);

const app = new App();
app.get('views').register(Item, ItemView);

const item = new Item({ name: 'Red Potion', price: 120 });
const view = app.view(item);
$('#main').append(view.artifact());
~~~

As you can see, we declare a class `Item`, and our `item` is now an instance of
that class instead of `Map`. `Model`s are really just fancy `Map`s, so we can use
them in exactly the same way.

The other change we made was to make an `App`, and teach it with the `.register()`
call that `Item`s can be rendered with `ItemView`s. It may seem a little odd that
there's a `.get('views')` in there, but it will make more sense later (it turns
out that `App`s are really themselves just `Model`s too).

The other thing to notice here is that a structure for organizing our code into
multiple files is beginning to emerge, too. We have a single line which declares
a `Model` which could be its own file that exports that `Model` class for use
elsewhere. Likewise with the `DomView`. Then finally, we have the last section
which glues it all together and makes it run.

Making Something Happen
-----------------------

Now that that's out of the way, let's get our application to actually do useful
interactive things: we'll add the ability to place an order.

~~~ noexec
const $ = require('jquery');
const { Model, DomView, template, find, from, App } = require('janus');

class Item extends Model {};
class Sale extends Model {};

const ItemView = DomView.build(
  $('<div><div class="name"/><div class="price"/><button>Order</button></div>'),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { sale.set('order', item); })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"></div>
    <h1>Order Details</h1> <div class="total"></div>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order').watch('price'))
  )
);

const item = new Model({ name: 'Red Potion', price: 120 });
const sale = new Sale({ inventory: item });

const app = new App();
app.get('views').register(Item, ItemView);
app.get('views').register(Sale, SaleView);

const view = app.view(sale);
$('#main').append(view);
view.wireEvents();
~~~

A lot of new code! But almost all of it you've seen already.

We've done a few things here. We added a `Sale` model to represent this transaction
as a whole, and made a view for it that shows our current inventory. We do this by
using the `.render()` call, which takes something to be rendered and uses the same
`app.view()` call we do at the bottom to actually get an appropriate view for it.

We also show the current total price for the sale, by watching the `price` of the
ordered item.

Finally, we actually rig up some actions, placing an event handler on the `button`
on each item which sets the `order` on the sale to that item. In order for that
event handler to actually take effect, we call `.wireEvents()` at the very end.
Janus does not wire in any event handlers unless you make this call, so that
it doesn't waste time with them during server-side rendering, where they will
never fire. You only have to call `.wireEvents()` once on the root view; it will
automatically cascade down to child views.

Hey, That Doesn't Seem Very Useful
----------------------------------

Okay, fine. Ordering a single item once is pretty boring. Let's add some `List`s
to the mix and see what happens.

~~~ noexec
const $ = require('jquery');
const { List, Model, DomView, template, find, from, App } = require('janus');
const stdlib = require('janus-stdlib');

class Item extends Model {};
class Sale extends Model {};

const ItemView = DomView.build(
  $('<div><div class="name"/><div class="price"/><button>Order</button></div>'),
  template(
    find('.name').text(from('name')),
    find('.price').text(from('price')),
    find('button').on('click', (event, item) => { sale.get('order').add(item); })
  )
);

const SaleView = DomView.build($(`
  <div>
    <h1>Inventory</h1> <div class="inventory"></div>
    <h1>Order Details</h1> <div class="total"></div>
  </div>`),
  template(
    find('.inventory').render(from('inventory')),
    find('.total').text(from('order').flatMap(list =>
      list.flatMap(item => item.watch('price')).sum()))
  )
);

const inventory = new List([
  new Model({ name: 'Green Potion', price: 60 }),
  new Model({ name: 'Red Potion', price: 120 }),
  new Model({ name: 'Blue Potion', price: 160 })
]);
const sale = new Sale({ inventory, order: new List() });

const app = new App();
stdlib.view.registerWith(app.get('views'));
app.get('views').register(Item, ItemView);
app.get('views').register(Sale, SaleView);

const view = app.view(sale);
$('#main').append(view);
view.wireEvents();
~~~

Not too much has actually changed. We now need the standard library, since it
knows how to render `List`s. On `Sale`, our `inventory` and our `order` data are
both now `List[item]`s instead of direct `item`s.

When we place an order, we add the item to the `order` list.

And when we display the total, we actually have to compute it now. We won't try
to overexplain it now, but what's happening is that we are transforming the `order`
list from a list of items into a list of prices (by mapping each item to its price).
Then, we are taking the sum of that resulting list.

> # Aside
Why are we calling `.flatMap()` all over the place instead of just `.map()`? We'll
cover this in more depth in the next chapter, but whenever we say `flatMap` in
Janus, what we mean is that we want to perform a `map` just like you would on a
list or an Option type (don't worry if you don't know what that is), but our mapping
function might return a `Varying`: we might change our mind about what value to
map to at some point in the future. For example, in this case, the `list.flatMap`
ensures that if the item price changes in the future, our list of prices remains
correct.

Next Steps
==========

We have just covered a lot of things:

* How to create a new Janus project and install the dependencies you need.
* Basic work with `Map`s, `Model`s, and `View`s.
* How to organize components of code into an application.

Hopefully, everything here made some amount of intuitive sense. It may still seem
mysterious how any of this is working, and the part we glossed over where we sum
up the prices might not make sense yet, but the goal is to walk away having:

* Written some code from scratch and run it.
* Gotten some idea of what some of these things do.
* Built some comfort with the idea of using the framework in general.
* Sensed that Janus is very modular and open-ended (look at how many individual
  things we pull out of that `require`!), and that applications don't need to
  follow any rigid structure.

Next, we need to go to basics and actually tackle some of the concepts at the heart
of Janus. Once you understand those basic building blocks, you'll be able to look
at the code we've written here and understand it at a fundamental level, without
any magical hand-waving.

Choose Your Own Adventure
-------------------------

From here, the paths diverge. We provide two separate introductory guides. Each
is independently useful, and you may well end up perusing some or all of both.
For now, pick your path based on what you're most curious about, and your learning
style:

* The [practical guide](/hands-on) picks up where we leave off here. It takes a
  short break to cover some fundamentals, but with an eye toward getting back to
  practical code as quickly as possible, continuing to build on the application
  we've worked on here.
* The [first principles guide](/theory) takes a different approach, starting with
  a more complete picture of the theory underlying Janus before rederiving the
  entire framework a step at a time to build a deep understanding of its pieces.
  It might sound boring, but it's actually quite snappy.

