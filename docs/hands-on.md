Hands On with Janus
===================

Here in the hands-on practical guide, we are not going to exhaustively cover every
aspect of Janus, nor are we going to go about using it in a terribly structured
way. If you are looking for that, take a look at the [theory-oriented guide](/theory).

Instead, here we are going to focus on building a practical application, exercising
and showcasing the most commonly used elements in Janus. We will do this by continuing
to build out the sample we started in the [getting started](/intro/getting-started).

A Note About the Samples in this Section
----------------------------------------

There will, however, be one difference between the samples you saw there and what
we will present from here forward. In the getting started guide, we structured out
an application in full, much as you would for real—

—first, with some HTML,

~~~ noexec
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script src="app.js"></script>
  </body>
</html>
~~~

and then with some code.

~~~ manual-require
// different components (that you can imagine putting in different files):
const $ = require('jquery');
const { List, Model, DomView, template, find, from } = require('janus');

class Thing extends Model {};

const ThingView = DomView.build(
  $('<div><div class="name"/></div>'),
  template(
    find('.name').text(from('name'))
));


// glue it all together into an application:
//   first, by building an application context..
const { App } = require('janus');
const stdlib = require('janus-stdlib');

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Thing, ThingView);

//   ..then by creating a root view for our application:
const things = new List([ new Thing({ name: 'one' }), new Thing({ name: 'two' }) ]);
const view = app.view(things);
$('#app').append(view.artifact());
view.wireEvents(); // usually you'll need this, but in this sample it does nothing.
~~~
~~~ target-html
<div id="app"></div>
~~~

To reinforce what's happening here: typically in Janus, you'll build useful individual
components: Models, Views, ViewModels, and so on. You'll pull all these components
together in some central file (think of it as your `main()` routine), by first
referencing them into the context of your overall `App`, and then by calling forth
some kind of root view to drop onto the page.

In this way, we can keep our application code modular and separate our concerns,
gluing them into a context at a single point rather than creating a vast spiderweb
of interlinked dependencies.

This is certainly not the only way to structure a Janus application, but if you're
not sure where to start it's the most typical approach.

For the rest of our samples here, though, we won't be going through all the homework
of `require`ing our dependencies and injecting a view into a markup fragment.
Because it's easier to work with these samples (for example to import them into
the interactive console, or to inspect the generated objects) when we are less
explicit about these things, we will no longer repeatedly demonstrate those patterns.

We will reference things like `Model` and `template` and so on without first `require`ing
them, because the sample framework on this documentation site already make them
available to us. We will simply `return` the `View`s we wish to render rather than
manually inject them into the DOM because it'll be taken care of for us.

Any time you need a refresher on how these things are done in a real application
(as opposed to sample snippets on this site), you can come back here, or you can
visit the [cookbook page](/cookbook/application) that describes typical application
structures.

Next Up
=======

The first thing we are going to do is revisit the sample code we wrote as part
of the [Getting Started guide](/intro/getting-started). We will add a little bit
to it, and talk it through more thoroughly to be sure we understand the basics
before we move onto more advanced ideas.

When you're ready, you will find that [here](/hands-on/shoring-up-basics).

