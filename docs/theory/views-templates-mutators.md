Views and Templaters and Mutators
=================================

&mdash;oh my! No, don't worry. This chapter is long but each of these systems are
quite small, each manages a distinct handful of things, and they fit together
composably and seamlessly. Here is a brief overview of each of them:

* **Mutators** are a lot like what you saw in the [rederiving Janus](/theory/rederiving-janus)
  chapter. They take some parameters specific to their purpose, then a `(dom, point, immediate)`
  context, and they return an `Observation`, which as you'll recall is a cancellable
  ticket for a Varying reaction.
* **Templates** group multiple Mutators together. They compose by inclusion (we'll
  get to that), which allows easy reusability of little pieces. They also do the
  work of interpreting and executing the selectors targeting each Mutator.
* **Views** take a subject, a DOM fragment, and a template, and each instantiation
  manages the lifecycle of a single view instance. It does this by providing a
  `point` context for the `from` statements in the template, managing client-side
  event wiring, and properly disposing of resources at the end of a view's life.

We'll go through each one in order, before delving into some topics that combine
knowledge of all three components: child Views, View Models, custom mutators,
custom `_render`, and `view.attach()`.

Mutators
========

Here is an entire mutator, exactly as written in the Janus source:

~~~ noexec
attr: (prop, data) -> (dom, point, immediate = true) ->
  data.all.point(point).react(immediate, (x) -> dom.attr(prop, safe(x)))
~~~

There's really no nonsense; each of the default mutators besides `render` is this
concise. You can easily imagine writing your own for your own needs, and indeed
this is a possibility we will cover. The `safe(x)` call, by the way, just ensures
that the value is coerced to a string.

Let's break down each component here. If it already looks good to you, possibly
because you remember it from earlier, feel free to skip ahead a little.

The first set of arguments are `(prop, data)`. This is meant to mirror jQuery's
own `.attr(prop, value)` call, but here instead of a concrete `value` we expect
to find a `from` expression which results in the value we wish to apply. Remember,
because `from` chains result in `Varyings` and mutators use `.react` as you see
above, this mutation will hold true for all of time. This first set of arguments
are what application code would actually call.

The second set of arguments takes `(dom, point, immediate)`. `dom` is the target
DOM node, and `point` is a function we can use to resolve our `from` expressions.
`immediate` is passed along to our Varying `.react` call, which as you'll recall
governs whether the initial value causes a reaction or not.

The idea here is that the first set of arguments defines the semantics of this
mutation: how do we mutate and what value should we mutate it to? The second
call, then, which is performed by the framework, injects the context relevant
to some particular instance of that mutator: what is the target of our mutations
and where do we get the data from? The result of this mutation operation is an
`Observation` ticket that represents that mutation, and which can be used to
cancel it.

The default mutators, which are exported in the `janus` package under `mutators`,
are:

* `attr(prop, value)` which sets a node's attribute.
* `prop(prop, value)` which… [also sets a node's attribute](https://stackoverflow.com/questions/5874652/prop-vs-attr#answer-5876747). Sort of.
* `classGroup(prefix, value)` which maintains class on the node of `prefix + value`.
  With each new `value`, any other classes starting with `prefix` are removed.
* `classed(class, value)` which sets some classname if some condition is true.
* `css(prop, value)` which sets some CSS property.
* `html(value)` which directly sets the html of some node (no XSS protection!).
* `text(value)` which sets the text of some node (XSS-safe).

In each of these, `value` is some `from` expression, and any other parameters
are static values. There are also `render()` and `on()`, but we will talk about
those separately later on.

Here's an example of using a mutator directly, but we won't spend to much time
poring over it, because typically you _won't_ be using them directly; instead,
you'll use the templating interface.

~~~
const dog = new Model({ name: 'Spot' });
const pointer = (model) => match(types.from.dynamic(key => model.get(key)));

const observation = mutators.text(from('name'))($('.target'), pointer(dog));
const teardown = () => { observation.stop(); }; // for use later.

dog.set('name', 'Woofers');
~~~
~~~ target-html
<div class="target"/>
~~~

Templates
=========

The templating system consists of two toplevel Janus exports: `template()` and
`find()`. `template` groups templating expressions together such as `find`, which
is a chaining API managing selectors and mutations.

> We are going to look at many examples of using templates, but bear in mind that
> while our template _definitions_ look like they would in typical application
> code, we would normally execute these templates in the context of a `DomView`,
> which we will avoid using until we cover them in the following section.
>
> You may also wonder how the mutators end up becoming chained operations off of
> `find`. We'll explain this later when we touch on [custom mutators](#bring-your-own-mutators).

~~~
const html = '<div><div class="name"/><div class="age"/></div>';

const nametag = template(
  find('.name')
    .text(from('name'))
    .css('color', from('name').map(x => x.includes('!') ? 'red' : '')),

  find('.age').text(from('age').map(x => x * 7))
)($(html));

const dog = new Model({ name: 'Spot!', age: 4 });

const target = $(html);
$('.sample-wrapper').append(target);

nametag(target, dog.pointer(), true);
~~~
~~~ target-html
<div class="sample-wrapper"/>
~~~

So each `find` call takes a selector within our component html fragment, and then
we can call any of our mutators to run that mutator against that selection target.
In fact, it looks like we can chain on as many mutations as we'd like, just as if
we were using jQuery.

In turn, the `template()` call takes one or more `find` chains, and groups them
together to act in concert.

But something is weird in our usage here. When we get our `template` back, we then
call `)($(html));` which feeds the template an html fragment. And then, in the
last line, when we give the template that `dom, point, immediate` context triplet,
it doesn't look like we're feeding it that same html fragment, but instead some
other copy of it that we've added to the page. What gives?

It turns out that template wants its target html fragment twice. Here is the full
function signature of `find` and `template`:

~~~ noexec
find('selector').mutator(…) => (domTemplate) => (domInstance, point, immediate) => [Observation]
template: (...finds) => (domTemplate) => (domInstance, point, immediate) => [Observation]
~~~

The first time it takes a dom fragment (`domTemplate`), this is a template for it
to learn from.  The templater will take all the selectors you've given it via `find()`,
run them against the template to find matching nodes, and learn those nodes as
walks of the DOM tree. Later, when it needs to actually execute the mutations,
it doesn't have to query the selector against the concrete fragment `domInstance`
every single time, it can just rewalk the tree according to the patterns it already
learned (eg "this selector matched the two children of the first child of the root
node").

This is for two reasons. The first is performance: selectors are slow, prebaked
tree walks are quite fast. The second is accidental capture: eventually, once we
cover the `render()` mutator, we will be able to nest views within each other.
If a view `b` is nested within our current view `a`, and both contain some node
`.name`, it would be unexpected and difficult to manage if a templating statement
`find('.name')` assigned to view `a` also selected the nested node within `b`.
Since our walk method learns its target nodes before nested views are rendered,
this way we know we are only selecting local matches.

The other thing you might notice from the above definitions is that `find` and
`template`, once given their semantic definitions, have exactly the same signatures.

> You might find it odd that `find` returns `[Observation]` rather than a single
> `Observation` as does a mutator. But while `find` only deals with a single
> selection, it _does_ let us chain multiple mutations onto that one selection.
> So it _could_ cause more than one `Observation`, and so for simplicity, it
> always gives us `[Observation]`.

This is intentional, because it lets us treat the two the same in a lot of ways;
most specifically, this trick lets us nest `template`s inside of each other:

~~~
const html = '<div class="target"><div class="name"/><div class="age"/></div>';

const nameFragment = template(
  find('.name')
    .text(from('name'))
    .css('color', from('name').map(x => x.includes('!') ? 'red' : ''))
  // you can imagine more find statements here..
);

const nametag = template(
  nameFragment,
  find('.age').text(from('age').map(x => x * 7))
)($(html));

const dog = new Model({ name: 'Spot!', age: 4 });

const target = $(html);
$('.sample-wrapper').append(target);

nametag(target, dog.pointer(), true);
~~~
~~~ target-html
<div class="sample-wrapper"/>
~~~

You can imagine, then, using `nameFragment` across many different templates that
have a common shared part, without having to separate that part into its own reused
component. You can even consider turning the whole thing into a function instead,
which can then become a very useful, reusable helper given some parameters:

~~~
const html = $('<div class="target"><div class="name"/><div class="age"/></div>');

const excitedText = (selector, key) => template(
  find(selector)
    .text(from(key))
    .css('color', from(key).map(x => x.includes('!') ? 'red' : '')));

const nametag = template(
  excitedText('.name', 'name'),
  find('.age').text(from('age').map(x => x * 7))
)(html);

const dog = new Model({ name: 'Spot!', age: 4 });

nametag($('.target'), dog.pointer(), true);
~~~
~~~ target-html
<div><div class="target"><div class="name"/><div class="age"/></div></div>
~~~

In fact, for that same reason that `template` and `find` are congruous, you don't
even have to wrap the `excitedText` snippet in the above example with a `template`
call unless it grows to involve multiple `find` expressions together. The same
thing will continue to apply as we get into full Views next: you don't have to
bother with `template` if you just have one `find` statement.

> # Aside
> Revelations like this&mdash;that tools like `template` and `find` aren't complex
> interwoven incantations that must be assembled in some particular way but rather
> simple primitives that with some basic understanding you can tear apart and mash
> together at will, are why we think there is value in this theory-based approach
> to Janus. We want you to feel completely comfortable with all these terms and
> tools as individual entities so that you can use Janus to its fullest.

There is one more pattern related to template reuse, which can be a little more
convenient in some cases than what we've shown so far. We'll get to it once we
cover Views.

Views
=====

We'll actually spend most of our time here talking about `DomView`s, which are
the species of `View`s that are specific to HTML DOM trees.

Looking at the results from our previous section, we already have a lot of power
by the time we get to `template`s. The syntax is a bit annoying, but in terms
of functionality all we're really missing is client-side interactivity, and some
sort of resource management around all these bindings.

These areas are exactly where DomViews step in.

~~~
const NameTag = DomView.build(
  $('<div><div class="name"/><div class="age"/></div>'),
  template(
    find('.name')
      .text(from('name'))
      .css('color', from('name').map(x => x.includes('!') ? 'red' : '')),

    find('.age').text(from('age').map(x => x * 7))
));

const dog = new Model({ name: 'Spot!', age: 4 });
const view = new NameTag(dog);
$('.sample-output').append(view.artifact());
~~~
~~~ target-html
<div><div class="sample-output"></div></div>
~~~

Gone is all the annoying boilerplate! By defining the convention that the given
fragment will be used both as the learning template and then cloned for each
instance of the view, we save ourselves having to manage that process. And by
defining the convention that each View has exactly one `subject`, to which we
anchor our `point` operation, we simplify the view invocation by a lot.

> Focusing each View around a single subject also greatly simplifies the task of
> creating [child views](#child-views), which we will cover below.

Here, we call `view.artifact()` to get the one canonical view-thing for this View
instance. For `DomView`s, the artifact is always a DOM fragment. Each View will
only ever manage a single artifact; calling `artifact()` a second time will yield
the same result.

Named template reuse
--------------------

As promised, here we will demonstrate one more way to reuse templates across
different Views. The advantage of this methodology is that it doesn't force you
to break the template rules out into a separate block of code:

~~~
const NameTag = DomView.build(
  $('<div><div class="name"/><div class="age"/></div>'),
  template(
    template(
      'formattedName',
      find('.name')
        .text(from('name'))
        .css('color', from('name').map(x => x.includes('!') ? 'red' : ''))),

    find('.age').text(from('age').map(x => x * 7))
));

const BusinessCard = DomView.build(
  $('<div><div class="name"/><div class="title"/></div>'),
  template(
    NameTag.template.formattedName,
    find('.title').text(from('title'))
));

const dog = new Model({ name: 'Spot', age: 4 });
const person = new Model({ name: 'Jane!!', title: 'Founder and CEO' });

return [ new NameTag(dog), new BusinessCard(person) ];
~~~

When you provide a `name` string as the first argument to a `template()` call,
the resulting template function will export itself as a property by that `name`
on itself. When you nest `template()`s, these named exports will get agglomerated
and conveyed up to the root, so they are all available on the final `template`
function and thus accessible from the View.

This approach is nice because it allows you to declare the template bindings in
line with the rest of the principle View they are a part of, so anybody reading
the code doesn't have to scamper off to other parts of the code to understand the
View, while still preserving easy reusability.

Client-side interactivity
-------------------------

Let's take a look at client-side interactivity. We already have jQuery, which is
a pretty effective tool for doing this sort of thing, but how does it fit into
the Janus picture?

There are two options. (We're going to simplify the template itself for the next
few examples, since you probably get that point by now.)

~~~
class NameTag extends DomView.build(
  $('<div><div class="name"/><div class="age"/><button>older</button></div>'),
  template(
    find('.name').text(from('name')),
    find('.age').text(from('age').map(x => x * 7))
)) {
  _wireEvents() {
    const dom = this.artifact();
    const dog = this.subject;
    dom.find('button').on('click', () => {
      dog.set('age', dog.get_('age') + 1);
    });
  }
}

const dog = new Model({ name: 'Spot!', age: 4 });
return new NameTag(dog);
~~~

Any instance of `DomView` can implement its `_wireEvents` method, and it will
get called whenever event wiring should occur. `DomView` will automatically wire
events on child views if it itself has been wired, so in a typical Janus application
structure with a single root view hosting all other views you'll only have to
call `.wireEvents()` once, on the root, and only on the client-side.

That's a lot of boilerplate, though, just to wire up a click event. Janus offers
another syntax to accomplish the same thing:

~~~
const NameTag = DomView.build(
  $('<div><div class="name"/><div class="age"/><button>older</button></div>'),
  template(
    find('.name').text(from('name')),
    find('.age').text(from('age').map(x => x * 7)),

    find('button').on('click', (event, subject) => {
      subject.set('age', subject.get_('age') + 1);
    })));

const dog = new Model({ name: 'Spot!', age: 4 });
return new NameTag(dog);
~~~

The `on` mutator is a little different than the others: it doesn't actually do
any databinding or node mutation, it just remembers your event handler. In a little
bit of a dirty trick, it stores it on the `Observation` ticket it creates, and
`DomView` works with this backdoor, searching all its Observation tickets for these
handlers when it needs to wire up events.

Your callback will be given a longish set of arguments: `(event, subject, view, viewDom)`.
You can also rely on [`.on('event', 'subselector', callback)` syntax](https://api.jquery.com/on/#on-events-selector-data-handler),
which can be really useful for handling events on behalf of children if there are
quite a lot of them and wiring each individually would be a performance concern.

Philosophically, we leave it to you to decide whether to mix this `on` syntax
in with your actual mutator bindings, or separate them into a block at the end,
or to ignore them altogether and use the `_wireEvents` method. You could even
use both `_wireEvents` and `on` at the same time if you felt it advantageous.

It's also entirely up to you what each of these handlers does. A variety of approaches
are possible, but we do have a suggested style.

Once you get used to solving problems in Janus&mdash;and especially once you get
a hang of describing each problem with the minimum, required, essential state
variables and letting all your other values fall out of them in bound mapping
computation&mdash;you'll find that almost all your interactivity handlers are
really short&mdash;usually between one and five lines, focused on changing a
single state value or injecting a single piece of truth into the system.

This brevity is nice, because these event handlers are one of the very few spots
in Janus where we don't really bother with the whole song and dance of pure functions
and immutability&mdash;and yet, because they are short manipulations it's still
easy to look at them and convince yourself of their correctness.

View Lifecycle
--------------

Okay, so what about disposing of our Views when we're done with them? We've created
a bunch of databindings that take up memory and processing cycles, and letting
them just run forever would slow us down a lot. Here is your first introduction
to `.destroy()`:

~~~
const NameTag = DomView.build(
  $('<div><div class="name"/><div class="age"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.age').text(from('age').map(x => x * 7))));

const dog = new Model({ name: 'Spot!', age: 4 });
const view = new NameTag(dog);
view.destroy();
return view;
~~~

Fine, so that wasn't very exciting. It turns out that `.destroy` is definitive
enough an action that it makes creating any kind of demonstration difficult:

* It halts all bound mutators (by `.stop()`ping their reaction `Observation`s).
* It emits a `destroying` event on the DOM fragment as an open notification.
* It removes its DOM fragment from the document.
* It stops some internal tracking reactions on child views which it uses to
  propagate `wireEvents`.
* It repeats the process for any child views.

It's pretty thorough. Importantly, all our reactions are manually and explicitly
freed up, so we know we aren't leaking any resources or computation.

Typically, though, you won't be calling `.destroy()` on Views; you can rely on
the `render` mutator, which handles child views, to do this for you.

Child Views
===========

Like the `on` mutator, `render` and DomView work together a little bit, unlike
the other mutators that are entirely opaque to DomView. To render a child view,
just ask for some subject to be rendered.

~~~
const Dog = Model.build();

const NameTag = DomView.build(
  $('<div><div class="name"/><div class="child"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.child').render(from('pup'))));

const app = new App();
app.views.register(Dog, NameTag);

const dog = new Dog({
  name: 'Spot',
  pup: new Dog({ name: 'Tot', pup: new Dog({ name: 'Blot' }) })
});
return app.view(dog);
~~~

So&mdash;we delayed discussing `render` because suddenly we have to talk a little
bit about `App` and `Library`. We will [go in-depth with them later](/theory/app-and-applications),
but in short `App` sequesters a lot of the glue code that makes some aspects of
Janus seem to magically work. We are running into one of those gluey bits here.

`App` is where we put a lot of the context that your application needs, like what
views you would like to use to render which objects. That actual association (that's
the `.register(TargetClass, ViewClassToUse)` call in the sample) and retrieval of
these associations is what `Library` is for, but we never create one here because
`App` comes with one built in&mdash;that's what we're pulling up when we call `.get('views')`.
The magical gluey part is that when we ask App to get us a view for some object
(`app.view(dog)` above) it sneakily injects itself as context on the resulting view.

That way, when _that_ view in turn (or, in actuality, the `render` mutator attached
to that view) is asked to render some child view, then once again all you need to
give it is the thing you'd like rendered, it just calls `app.view()` and gets a
new child view&mdash;in turn, that new child view _also_ gets a reference to your
App injected into it.

Of course, you may have more than one view representation for each object, or
arguments you want to pass to the created child view. To accomplish this, `render`
has its own subchaining methods: `.context()` and `.criteria()` help describe
the View you are looking for, while `.options()` passes `options` objects to the
instantiated child View. We'll show `.options` in use here, and save the other
two for a later chapter when we talk more about App.

~~~
const Dog = Model.build();

const NameTag = DomView.build(
  $('<div><div class="name"/><div class="child"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.child')
      .render(from('pup').and.self()
          .all.map((pup, view) => (view.options.depth > 1) ? null : pup))
        .options(from.self().map(view => ({ depth: (view.options.depth || 0) + 1 })))
      .classed('has-children', from('pup').map(x => x != null))
  ));

const app = new App();
app.views.register(Dog, NameTag);

const dog = new Dog({ name: 'Spot',
  pup: new Dog({ name: 'Tot',
    pup: new Dog({ name: 'Blot',
      pup: new Dog({ name: 'Jot' }) }) }) });
return app.view(dog);
~~~

So we learn two things. In these chained additions to `render` we can still use
`from` expressions, so we can generate these additional inputs from our data as
usual (though they also happily take static values). And, even though we have
subchained into the purview of `render` we can still chain back into the larger
context, adding on further mutators without trouble (as long as the names don't
conflict, in which case the subchain is preferred).

> You can also use View Navigation (covered below) to operate based on view hierarchy
> and nesting structure. We cover that later in this chapter.
>
> And typically, unless it's a really big performance difference not to draw the
> additional views, we would actually recommend the use of CSS to accomplish
> the sort of task in the previous sample, since it's significantly simpler:
>
> ~~~
> .nametag .nametag .nametag { display: none; }
> ~~~

Again, we'll cover the other subchain methods in greater detail once we get to
the [chapter on App and Applications](/theory/app-and-applications), but in terms
of how they can accept `from` expressions and chain, they are the same as you
see here.

> If you want to see some usage now, check out the second example in the
> [View Models](#view-models) section just below.

Behind the scenes, DomView and the render mutator work together to ensure that
`.wireEvents()` is filtered down to subviews when it should be, including when
the subview is swapped out. The render mutator also makes sure any discarded views
are properly disposed of with `destroy`. (Both of these tasks are accomplished
by a `.view` Varying that `render` sneakily maintains on the Observation
ticket&mdash;perhaps you are seeing a pattern here.)

Advanced Techniques
===================

Various combinations of everything you've just learned will cover most of your
rendering needs. It's worth covering, at least in brief, three advanced techniques.

* View Models are really useful when you have view-related state you want to databind
  without polluting your true Model data, when there are calculated values based
  on your Model data that your View repeatedly relies on, or when multiple Models
  need to be considered when rendering a view.
* View Navigation can help you perform operations based on the hierarchical relationship
  between Views as drawn on the page.
* As with everything in Janus, the default mutators may be augmented or supplanted
  entirely by your own implementations.

By now, you should be familiar with the ritual: these are useful concepts to skim
so you have some concept that they exist and what they are, but it's not necessary
to understand each one in significant detail when you're getting started.

There are also two very powerful and useful advanced techniques we have broken out
into a separate article each:

* You can skip all the convenient structures we've provided and handle rendering
  on your own, for managing complex drawing tasks or extreme cases where performance
  becomes a serious concern. For information about this, please see the Further
  Reading chapter on [custom view rendering](/further-reading/view-custom-render).
* [View `attach()`](/further-reading/view-attach) is a powerful feature in Janus,
  and is the reason we've been passing the `immediate` parameter around. With `attach`,
  you can initialize your application in the browser on the client side against
  markup generated by your server, without doing any work to redraw the page. This
  can drastically speed up page responsiveness on load.

View Models
-----------

Janus tends closer to an [MVVM](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel)
philosophy than [MVC](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller).
This is evidenced by the fact that we happily allow views to directly manipulate
data in our examples above, and confluent with how our automatically updating
databindings eliminate a lot of the state management busywork commonly associated
with controller code.

Part of this philosophy is that many problems that are annoying to solve with a
Model alone can be made much simpler by injecting a ViewModel in between the View
and the Model. But in Janus, ViewModels are just a convention: they are Models&mdash;no
more and no less.

One example of such a case is when multiple Models relate to a single rendering
problem.

~~~
const Policy = Model.build();
const Person = Model.build();

const PolicyView = DomView.build(
  $('<div><div class="name"/><div class="eligibility"/></div>'),
  template(
    find('.name').text(from('name')),
    find('.eligibility').render(from.self()
      .and.app('current_user') // watches a key on our app model (see below)
      .all.map((policy, person) => new EligibilityViewModel({ policy, person })))));

const EligibilityViewModel = Model.build();
const EligibilityView = DomView.build(
  $('<div><span class="name"/> <span class="status"/> eligible for benefits.</div>'),
  template(
    find('.name').text(from('person').get('name')),
    find('.status').text(from('person').get('age')
      .and('policy').get('minimum_age')
      .all.map((age, min) => (age >= min) ? 'is' : 'is not'))));

const app = new App();
app.views.register(Policy, PolicyView);
app.views.register(EligibilityViewModel, EligibilityView);

// say we set this somewhere as a part of logging in:
app.set('current_user', new Person({ name: 'Jane', age: 34 }));

const policy = new Policy({ name: 'Elder Care', minimum_age: 55 });
return app.view(policy);
~~~

So here, `EligibilityViewModel` accomplishes two things:
1. It restructures our data into a shape that makes the required computation easy.
2. It gives `render` something to latch onto when finding the right view, because
   we register the `EligibilityView` against it.

So then all we have to do is instantiate an `EligibilityViewModel` with the needed
data and the computation can happen, and the correct view will be drawn. In general,
you'll find that a _lot_ of problem solving in Janus is accomplished by structuring
the data in a way that makes your computations easy to bind and perform.

And in this case, the fact that `EligibilityViewModel` is purely a convention:
it's just a `Model` that we decided should be considered a View Model because it
doesn't carry any inherent truth about our data.

But we had also mentioned that View Models are useful in single-Model cases for
computing repeatedly referenced intermediate values or storing additional view-related
state somewhere it can be databound, and for this Janus provides a little syntactic
sugar to make this rote task easier:

~~~
const Person = Model.build();

const PersonViewModel = Model.build(
  attribute('children.show', attribute.Boolean),

  bind('children.count', from.subject('children')
    .flatMap(cs => (cs == null) ? 0 : cs.length))
);
const PersonView = DomView.build(PersonViewModel, $(`
  <div>
    <div class="name"/>
    <div class="child-count">
      <span class="num"/> <span class="label"/>
    </div>
    <div class="child-show"/>
    <div class="child-list"/>
  </div>`), template(

  find('.name').text(from('name')),

  find('.child-count .num').text(from.vm('children.count')
    .map(count => (count === 0) ? 'no' : count)),
  find('.child-count .label').text(from.vm('children.count')
    .map(count => (count === 1) ? 'child' : 'children')),

  find('.child-show')
    .render(from.vm().map((vm) => vm.attribute('children.show')))
      .context('edit')
      .criteria({ style: 'button' })
      .options({ stringify: (x => x ? 'hide' : 'show') })
    .classed('hide', from.vm('children.count').map(count => count === 0)),

  find('.child-list')
    .render(from('children'))
    .classed('hide', from.vm('children.show').map(x => !x))

));

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Person, PersonView);

const person = new Person({ name: 'Alice', children: new List([
  new Person({ name: 'Bob', children: new List([ new Person({ name: 'Bobbi' }) ]) }),
  new Person({ name: 'Chelsea' })
]) });

return app.view(person);
~~~

Okay, so a lot is going on here that is a little new. Let's get a few quick ones
out of the way:

* There are some unfamiliar things going on with this `PersonViewModel`:
  * We're declaring an `attribute` on our Model, which helps us declare behavior
    on particular keys on the Model. We then call `render` on `from.attribute`
    of that key, which apparently gets us a button from the standard library.
  * We also see a `bind()` call in the Model definition. This one is pretty
    straightforward: that key on the Model will always carry the given computed
    value.
  * We'll get into these things in a [later chapter](/theory/maps-and-models),
    on (Maps and) Models.
* Here, as promised, is an example of the `.context` and `.criteria` subchain
  methods on `render`. They describe to the Library the kind of view we are
  looking for (try removing the `.criteria` line, for example).
  * Again, we will cover this in more depth later.
* We need to render Lists and buttons, so we teach our app about the views available
  in the Standard Library (`stdlib.view($).registerWith(library)`). The Standard
  Library itself needs access to whichever jQuery-alike we are using, because it
  does not come with its own.
* We also rely on a common convention in Janus applications, to define a `hide`
  CSS class which applies `display: none !important;` to the element.

But the star of the show here is the extra parameter we've given to our DomView
builder, that `{ viewModelClass: PersonViewModel }` at the start. Notice that we're
still just `register`ing `PersonView` to `Person`, nothing about the View Model
there. And likewise, when we ask our app for a view, we just give it a `Person`,
not a View Model.

Instead, with this `viewModelClass` option we ask `View` to transparently create
a View Model class of the given type. That Model class is then given some context
data in the form of plain key/value data attributes, just like we've been assigning
`name` and `age` in all these examples. These are `{ subject, view, options }`
where `subject` is the original intended subject for the view, `view` is the view,
and `options` are `view.options`.

Because Model gives us a lot of tools for describing data properties and relationships
between them (using `attribute` and `bind` and other useful features you'll see
later), this additional little View Model sandbox to play in gives you a lot of
room to organize presentation behaviour about your View.

Here, we need the child count multiple times, and while we could declare a standalone
`const count = from('children').flatMap(…)` expression and use it twice in our
template, it's nice for it to exist in a structure somewhere, and for it to be
computed only once. And, rather than implement event handlers with ad-hoc internal
state to create our hide/show behavior, we can just use data modeling and Standard
Library components to accomplish the same task, without any messy imperative code
at all.

To use data from the View Model rather than the subject Model, you can see that
we use `from.vm()` (vm being short for View Model) rather than `from()` or `from.get()`.
Relatedly, when we render our `children.show` attribute, we run into the fact that
`from.attribute()` refers specifically to the _subject_ Model. So, we have to get
the View Model first before `map`ping out the attribute in question (`from.vm().map(…)`).

So when you have to combine multiple Models, or compute repeatedly used or complex
multistep values, or add additional view-specific context in order to make your
View a reality, give some thought to how inserting a View Model might help. We
will give more examples of this sort of structure and thinking in the chapter on
Maps and Models.

View Navigation
---------------

There will sometimes be cases where you will need to understand something about
the View Hierarchy in order to correctly perform some operation or render some
View.

In this documentation, for example, the `SampleView` needs to have access to the
code `Editor` view within it to do basic actions like set the cursor focus or
navigate to some line and column within the text. In the other direction, the console
`ReplView` needs access to the overall `AppView` that serves as the root of this
entire page in order to hide itself when asked to.

Though not a requirement of every application, this is a common enough problem in
Janus that we have created a solution: View Navigation.

~~~
class Child extends Model {}
class ChildView extends DomView.build(
  $('<span/>'),
  find('span').text(from('id'))
) {
  flash() { this.artifact().animate({ opacity: 0 }, 8).animate({ opacity: 1 }, 400); }
}

const { floor, random } = Math;
class Parent extends Model {
  randomize() { this.set('target', floor(random() * this.get_('children').length_)); }
}
const ParentView = DomView.build(
  $('<div><div class="list"/><button/></div>'),
  template(
    find('.list').render(from('children')),
    find('button')
      .text(from('target').map(t => `Flash ${t}`))
      .on('click', (event, subject, view) => {
        const target = subject.get_('target');
        view.into_('children').into_(target).flash();
        subject.randomize();
      })
));

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Child, ChildView);
app.views.register(Parent, ParentView);

const children = new List((new Array(10)).fill().map((_, id) => new Child({ id })));
const parent = new Parent({ children });
parent.randomize();

return app.view(parent);
~~~

Here we define some of our own methods on both a View and a Model. This is a good
practice not so much to privatize internal concerns but rather to ensure consistent
handling of common tasks and make code more readable elsewhere.

But the critical bits here are the calls to `.into_` on the View. The View Navigation
methods are description-based data structure navigators. Here, we first provide
a string key `children`, which corresponds to the `children` property on the Model.
The `.into_` method will return the first immediate child View it finds that is
associated with that data value, which in this case will be a `ListView`. In turn,
we call `.into_` again on that `ListView` with a numeric index, and the process
repeats. When we have our desired `ChildView` in hand, we call `flash()` on it.

`.into_` is not the only navigation method:

* `.into` is the same as `.into_` but returns a `Varying` result instead, which
  as you might expect by now is kept up to date as data changes.
* `.intoAll` and `.intoAll_` work like `into`, but will return an `Array` or a
  `List` (respectively) with _all_ matching immediate child Views.
* `.parent` and `.parent_` will return the immediate parent.
* `.closest` and `.closest_` will return the closest parent that matches the criteria.

And there are several ways to describe the View you are looking for:

* If no parameter is provided (or you pass `undefined`), there is no criteria and
  any Views found by the navigation walk will be returned.
* As you have seen, if a string or number is provided, it is assumed to be a data
  key and the data value associated with the key will be the search target.
* If the provided value exactly matches a child View or a child View's subject,
  that View will be returned.
* If a class type is provided and a child View or the child View's subject is an
  `instanceof` that class type, that View will match.

> # Aside
> You can also access the View Navigation methods as functions instead of instance
> methods, under View.navigation. The function versions have the same name, but
> take the View to search _from_ as the second parameter.

For another example of View Navigation, see the [Advanced Layout](/cookbook/advanced-layout)
Cookbook entry.

Bring Your Own Mutators
-----------------------

With mutators as with every aspect of Janus, we allow you to augment or entirely
replace default behavior. The default set of mutators is exported in the Janus
package as `mutators` and as is often the case you can call `.build()` to create
your own chaining interface:

~~~
const colorize = (data) => (dom, point, immediate = true) =>
  data.all.point(point).react(immediate, color => { dom.css('color', color); });

const myfind = find.build(Object.assign({ colorize }, mutators));

const NameTag = DomView.build($('<div class="name"/>'), template(
  myfind('.name')
    .text(from('name'))
    .colorize(from('color'))));

const dog = new Model({ name: 'Spot', color: 'magenta' });
return new NameTag(dog);
~~~

We use `Object.assign` to merge the usual set of mutators into our own set, which
here is just the `colorize` mutator. Typically, when you have custom mutators like
this, you'd define them in some common utility file that then exports your `find`
function, and this is where you would get `find` from throughout your application
rather than the Janus package.

Another example of a custom mutator can be found in the [Flyouts](/cookbook/flyouts)
Cookbook entry.

Recap
=====

Mutators, Templates, and Views required a lot of explanation, simply because they
accomplish so much. But they are not, in isolation, complex, nor are they some
monolithic, tightly-bound machine. In fact, we'd encourage you to go [peruse the
actual implementation](https://github.com/issa-tseng/janus/tree/master/janus/src/view);
none of these components are longer than 100 lines of commented code.

To review:

* Mutators take a set of purpose-specific arguments, including data in the form
  of `from` expressions, then a `(dom, point, immediate)` context triplet, and
  return an `Observation` ticket that can cancel the mutation.
  * The default mutators are modeled synactically off of jQuery for familiarity.
  * You can define your own mutators, and incorporate them into `find` using
    `find.build()`, which gives you a new souped-up `find`.
* Templates allow you to `find` targets in a fragment to mutate, and `template`
  just combines multiple `find` operations together.
  * And `template`s can include other `template`s just by inclusion. No inheritance
    needed.
* Views manage the boilerplate and lifecycle around mutators and templates.
  * Each View has a single `subject` that serves as its data context.
  * Upon `.destroy()` Views carefully dispose of any computing resources they created.
  * `_wireEvents` can be overridden to apply client-side interactivity, but the
    `on` mutator is often a simpler shortcut.
* View Models are a powerful tool for restructuring or augmenting pure Model data
  to make view rendering problems easier to solve.
* Other powerful functionality exists that we have hinted at here but are described
  in detail in Further Reading chapters:
  * `_render` can be overridden to skip the normal templating machinery, but care
    must be taken around changing values and resource management.
  * You can call `view.attach(dom)` instead of `view.artifact()` to attach a View
    instance to an already-correct DOM fragment. This can save an initial re-render
    when your application spins back up on the client-side.

Next Up
=======

We're taking huge leaps now that we're past the `Varying`, `case`, and `from` core
facilities. Here we covered all of the templating and view infrastructure, and
in our next chapter we're going to [talk about Lists](/theory/lists).

They won't be too surprising: a lot of the terminology and functionality you already
know (`map`, `filter`, `concat`, and so on) but they are, of course, reimagined
with Janus philosophy.

We will dig a little bit into how Lists work behind the scenes, as this will
become important if you wish to implement your own transformations or Views.

See you there!

