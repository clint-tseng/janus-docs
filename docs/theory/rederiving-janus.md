Rederiving Janus
================

Here, we are going to start with the fundamental goals and desires we covered in
the [previous article](/theory/origins-and-goals), and work forwards from them
one step at a time, building pieces as we go to create something resembling a
frontend framework.

The goal with this article is to show why a lot of the major core components of
Janus exist and work the way they do, as well as to preview some very rudimentary
versions of those components to give you a taste for how they form the bigger
picture.

We will start off by trying to make a single mutation to the DOM.

A Single Mutation
=================

Previously, we described some of the functionality a framework must provide in
order to fulfill our goals and principles. One of those was idempotent mutation.

Well, this isn't so hard; we can just rely on something like jQuery to get this
done. Let's start with a simple example, setting the text of some node.

~~~
const mutate = (value) => $('.target').text(value);
mutate('hello.');
~~~
~~~ target-html
<div class="target"></div>
~~~

This isn't very exciting. All we've done is wrapped a call to jQuery that sets
the text of some hard-coded node to some value. Let's try to generalize it a bit.

~~~
const mutate = (target) => (value) => target.text(value);

const mutateTarget = mutate($('.target'));
mutateTarget('hello.');
~~~
~~~ target-html
<div class="target"/>
~~~

The result is the same, but at least now we have some way of reusing this code.
We contextualize the operation by calling it the first time, after which we get
a function which mutates some particular node. This is a simple example of using
higher-order functions.

Handling Changes
================

We had also described the need for some kind of evented databinding system which
would indicate when mutations need to occur. Let's try to build some kind of
mechanism like that now.

~~~
// "framework" pieces:
class Datum {
  constructor(value) {
    this.value = value;
    this.listeners = [];
  }
  set(value) { // called to set the value of this Datum
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
  onChange(listener) { // called to listen to changes to this Datum value
    this.listeners.push(listener);
    listener(this.value); // call listener immediately!
  }
}
const mutate = (target, datum) => datum.onChange(value => target.text(value));

// implementation:
const greeting = new Datum('hello.');
mutate($('.target'), greeting);

greeting.set('yo!');
~~~
~~~ target-html
<div class="target"/>
~~~

Now we have a way of tracking a single piece of information, and notifying any
interested parties when that information changes. One of those interested parties
is our mutator, which we upgrade to take a Datum.

> You can see that previously, `mutate` had a `(target) => (value) => impure!`
> signature, whereas now we have combined the parameters into a single call. Before,
> we had to call the mutator every time the value changed, so it made sense to
> bind the target node context first. Now, the whole operation kicks off in one
> go (`target` and `datum` are the only context we need and they are natural to
> provide at once) and it just carries on by itself, so the higher-order contextualization
> is no longer so useful.

The next requirement we had described was some way to perform some transformation
on the source value before it is used as the input to the mutator. So we need to
be able to take a `transform` function somewhere that given the data value returns
the correct value to give the mutator. Looking at the code, we have a few options:

1. Add a `transform` parameter to the `onChange()` method on Datum. But our mutator
   takes the Datum directly and calls `onChange` on its own. So it's not clear
   how to plumb this cleanly.
2. Add a `transform` parameter to the mutator, such that it takes `(target, datum, transform)`
   and have it run the transformation function each time it gets a new value. But
   this gets annoying (and inefficient!) if, say, multiple mutators want to use
   the same transformation result.
3. Add something to Datum itself&mdash;perhaps some way to call `.transform()`
   and get a new Datum which always houses the transformed value.

This last one looks promising! Our mutator doesn't have to understand the difference
at all, so we don't have to change it. We also get a general-purpose way of reusing
a transformation of a value, by passing around the resulting transformed Datum.
Let's see what this looks like in code. Most of it is the same. The `transform`
method is new, and the implementation section at the bottom has changed a bit.

~~~
class Datum {
  constructor(value) {
    this.value = value;
    this.listeners = [];
  }
  set(value) {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
  onChange(listener) {
    this.listeners.push(listener);
    listener(this.value);
  }
  transform(f) {
    const result = new Datum();
    this.onChange(value => result.set(f(value)));
    return result;
  }
}
const mutate = (target, datum) => datum.onChange(value => target.text(value));

// implementation:
const greeting = new Datum('hello.');
const transformedGreeting = greeting.transform(x => x.toUpperCase());
mutate($('.target'), transformedGreeting);

greeting.set('yo!');
~~~
~~~ target-html
<div class="target"/>
~~~

Hey, that's pretty neat! We accomplished a lot by adding just a few lines of code.
We now have some way of tracking some value, and then building an arbitrary chain
of transformations of that value, and all those values always stay correct.

One change we'll make before we move on: let's rename `transform()` to `map()`.
Any of you old hands at functional programming will have no problem with this,
but if your functional programming experience is more related to [underscore](https://underscorejs.org/)
or [lodash](https://lodash.com/), you may want to read the following aside.

> # Aside
> Why is `map()` a sensible name to use here? You may especially be asking this
> question in relation to `Array.map()` (or `_.map()`), and wondering why we'd use
> the same term to describe an operation that only deals with a single value.
>
> The answer requires us to think a bit more more broadly about what array `map`
> accomplishes for us: it gives us a way to manipulate the values within the array
> without having to deal with the mechanical details of arrays themselves. In
> functional programming terms, `map` is a generic way to transform values within
> a box (array) and get a new box (array) while relying on the box itself to mind
> the mechanical details for us. This is reflected by the fact that we give `map`
> a function that takes a plain value unrelated to an array, and returns another.
> The fact that array happens to deal with many values at once is an array-specific
> detail.
>
> Our Datum is a box, just like an array. Just like arrays have the useful
> mechanical detail that they deal with many values at once, Datum lets us deal
> with values that change over time. And just like array, the people trying to
> use Datum for their own purposes shouldn't have to worry about the mechanics
> of the box itself. And so, we take a mapping function that deals with plain
> values, and we call that method `map()`.

Let's use this entire mechanism again, just to be sure we really understand it
and it really works in a variety of situations. Let's say we want to set the greeting
text, but we also want to toggle some html class on the target node at the same
time.  Datum is unchanged here besides the rename of `transform` to `map`; the
only additions are the definition and usage of the `mutateClass` impure function.

~~~
class Datum {
  constructor(value) {
    this.value = value;
    this.listeners = [];
  }
  set(value) {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
  onChange(listener) {
    this.listeners.push(listener);
    listener(this.value);
  }
  map(f) {
    const result = new Datum();
    this.onChange(value => result.set(f(value)));
    return result;
  }
}
const mutateText = (target, datum) =>
  datum.onChange(value => target.text(value));

const mutateClass = (target, className, datum) =>
  datum.onChange(value => target.toggleClass(className, (value === true)));

// implementation:
const greeting = new Datum('hello.');

mutateText($('.target'), greeting.map(x => x.toUpperCase()));
mutateClass($('.target'), 'excited', greeting.map(x => x.includes('!')));

greeting.set('yo!');
~~~
~~~ target-html
<div class="target"/>
~~~

We're now just passing along `greeting.map()` directly rather than creating the
`transformedGreeting` reference in between, but the effect is the same.

And also, we've added the `mutateClass` mutator, but it turns out we need another
parameter to make it work: we need to be able to take in the actual name of the
class to add or remove to the node, depending on the truthiness of the given data.
You can inspect the "YO!" text in the sample result to verify that it is `.excited`.

> Sharp observers will notice that you could sneakily use `map` anywhere you would
> use `onChange` and everything would behave the same. This is true! But only in
> this simplified case. In real Janus, things don't work quite that way: the two
> are genuinely distinct, for reasons we will get to.

Seems okay! This machine is pretty simple, but it seems to generalize just fine.

Constructing a Whole View?
==========================

Well, we've fulfilled all the objectives we laid out in the previous article: we
have a way of performing idempotent mutations, databound against a changing value
which can optionally be transformed before it is applied. Sounds great! Let's
start making this look a little more like a framework.

What we'd like to do next is create the concept of a reusable view, where we can
use the tools we've created to declaratively describe the relationships between
some data to be displayed and the mutations that would make that happen. The views
could then be easily instantiated many times against different instances of data
and spots in the document.

Let's see what that code might look like, using the `mutateText` we already wrote.

~~~ noexec
const mutateText = (target, datum) => datum.onChange(x => target.text(x));
const view = (...mutators) => (target) => mutators.forEach(m => m( ..uhh
~~~

Hm. The way `mutateText` works, it can't be invoked without being given an
already-concrete `target` DOM element, which makes it hard to use in a declarative
context. We can make it more generalized by taking a selector instead of a concrete
target, and we can take our concrete `target` DOM as part of a later call:

~~~ noexec
const mutateText = (selector, datum) => (target) =>
  datum.onChange(value => target.find(selector).text(value));

const view = (...mutators) => (target) => mutators.forEach(m => m(target));

const greetingView = view(mutateText('.greeting', ..something
~~~

We have the same problem now with the mutator `datum` requirement: it must already
be a concrete instance of data by the time the mutator is invoked. Once again,
this prevents us from using the mutation function as part of a declarative system.
We fixed this for the DOM `target` by pushing the concrete reference back to a
second-order call that imbues the mutator with the context it needs to actually
function against a real target; maybe we can do something similar for our data:

~~~ noexec
const mutateText = (selector) => (data, target) =>
  datum.onChange(value => target.find(selector).text(value));
const view = (...mutators) => (data, target) => mutators.forEach(m => m(data, target));
~~~

But this doesn't work so well. How does the data we are given relate to the mutators
we've declared? At the time we define the view, we have no ability to actually
describe what the data ought to be and how it ought to be handled. With the abstractions
we have defined so far, we would never be able to do so without already having the
concrete data instances in our hands.

This prevents us from creating generically reusable views. There are some ways
we can work around these issues without making radical changes, but they are quite
wordy and not very nice. Somehow, we need to be able to create mutators against
data we don't yet have, and promise we'll give them that data later.

Datum Indirection
=================

Let's review our goals for a moment before we try to construct a solution to this
problem:

1. We want to be able to construct reusable Views.
   * At definition time, Views should take a bunch of mutators (or, rather,
     descriptions of mutations that will become mutators).
   * At execution time, a View should be created by taking a target node and
     some concrete piece of data to bind against. Those mutators should be put
     to work on this new context.
2. So, we want to be able to create Mutators before they have concrete data.
   * Somehow, that data will be fed to the mutator, along with a target node,
     when the mutator actually needs to go to work.
   * Ideally, we should also be able to capture mapping transformations when the
     mutator is defined, but right now we can't call `map` without a Datum to
     call it on.

Somehow, we need to box the box: we need a way to talk about a Datum before we
actually have the Datum in hand, just as Datum lets us talk about particular
values over any period of time. What's more, to capture the mappings (transformations),
we should be able to describe all the maps we _eventually_ wish to apply to the
Datum once we do have it.

What's really open-ended is how exactly this&mdash;let's call it a `Predatum`&mdash;is
actually turned into a real Datum, other than that if we are to have views that
bind against data it must happen on demand and if our views are to be reusable this
contextualization will possibly occur repeatedly, each time yielding a different
Datum.

Okay, let's just do something simple, then: we'll remember some description of
the data, and take a function down the road that understands what datum to supply
given that description. What should the description be? With an eye toward some
eventual world where we are binding views against some sort of key/value model-like
entity, we'll just use some placeholder value called `of`, which is just a string,
for now.

Our sample snippets have gotten quite long now, but only because of our stubborn
reinclusion of our entire pretend framework every time. The new thing this time
is the implementation of Predatum, which keeps track of some vague placeholder
which our `datumifier` will eventually know how to interpret into a real Datum.

~~~
const identity = (x) => x;
class Predatum {
  constructor(of, _mapper = identity) { Object.assign(this, { of, _mapper }); }
  map(f) { return new Predatum(this.of, x => f(this._mapper(x))); }
  toDatum(datumifier) { return datumifier(this.of).map(this._mapper); }
}
class Datum {
  constructor(value) {
    this.value = value;
    this.listeners = [];
  }
  set(value) {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
  onChange(listener) {
    this.listeners.push(listener);
    listener(this.value);
  }
  map(f) {
    const result = new Datum();
    this.onChange(value => result.set(f(value)));
    return result;
  }
}

const mutateText = (selector, predatum) => (target, datumifier) =>
  predatum.toDatum(datumifier).onChange(value => target.find(selector).text(value));

const mutateClass = (selector, className, predatum) => (target, datumifier) =>
  predatum.toDatum(datumifier).onChange(value =>
    target.find(selector).toggleClass(className, (value === true)));

// implementation:
const pregreeting = new Predatum('greeting');
const textMutator = mutateText('.target', pregreeting.map(x => x.toUpperCase()));
const classMutator = mutateClass('.target', 'excited', pregreeting.map(x => x.includes('!')));

const greeting = new Datum('hello.');
const target = $('.container');
const datumifier = (of) => {
  if (of === 'greeting') return greeting;
  else null; // handle other references to concrete data...
};
textMutator(target, datumifier);
classMutator(target, datumifier);

greeting.set('yo!');
~~~
~~~ target-html
<div class="container"><div class="target"></div></div>
~~~

The Predatum also keeps track of a mapping function to immediately apply to the
Datum once it is real. We can stack mapping functions together by creating a new
Predatum each time, and each time composing the new function on top of the one
or many old ones.

You will notice that Predatum has actually very little idea what a Datum is, other
than that it can eventually be `map`ped. It never creates one itself&mdash;that is
the responsibility of the datumifier, which takes that placeholder value and gives
a Datum that satisfies it. You can see that our datumifier function really only
handles the string `"greeting"` right now, but it could be expanded to handle all
sorts of things.

The last important thing to notice is that our actual mutator instances, the ones
that actually say "hey, when you get this particular greeting value put it here
but also maybe uppercase it, or maybe set a class based on it," the ones we might
consider a nascent reusable view, are now finally declarable _before_ the existence
of the data they will eventually rely upon, as well as the target they should be
mutating. Take a look at the previous samples to verify this for yourself: only
now has this ordering of statements become possible.

We didn't do it here, but they are also reusable: just call them again with a
different pair of `target` and `datumifier` and they'll happily apply that behavior
to that new context. In fact, look at how `target` and `datumifier` are passed
to the two mutators: they are identical! They receive these values exactly the
same way. Now we have some hope at actually building reusable views.

Reusable Views, For Real
========================

In fact, we have incredibly little work left to do. All we really have to do is
keep a pile of mutators around, and distribute context to them when the time comes.
Don't worry, this is as long as our samples are going to get. You've seen nearly
all this code already. Only `view` and its usage are new.

~~~
const identity = (x) => x;
class Predatum {
  constructor(of, _mapper = identity) { Object.assign(this, { of, _mapper }); }
  map(f) { return new Predatum(this.of, x => f(this._mapper(x))); }
  toDatum(datumifier) { return datumifier(this.of).map(this._mapper); }
  static of(of) { return new Predatum(of); }
}
class Datum {
  constructor(value) {
    this.value = value;
    this.listeners = [];
  }
  set(value) {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
  onChange(listener) {
    this.listeners.push(listener);
    listener(this.value);
  }
  map(f) {
    const result = new Datum();
    this.onChange(value => result.set(f(value)));
    return result;
  }
}
const view = (...partialMutators) => (target, datumifier) =>
  partialMutators.forEach(mutator => mutator(target, datumifier));

const mutateText = (selector, predatum) => (target, datumifier) =>
  predatum.toDatum(datumifier).onChange(value => target.find(selector).text(value));

const mutateClass = (selector, className, predatum) => (target, datumifier) =>
  predatum.toDatum(datumifier).onChange(value =>
    target.find(selector).toggleClass(className, (value === true)));

// implementation:
const greetingView = view(
  mutateText('.target', Predatum.of('greeting').map(x => x.toUpperCase())),
  mutateClass('.target', 'excited', Predatum.of('greeting').map(x => x.includes('!')))
);

const greeting = new Datum('hello.');
const datumifier = (of) => {
  if (of === 'greeting') return greeting;
  else null; // handle other references to concrete data...
};
greetingView($('.container'), datumifier);

greeting.set('yo!');
~~~
~~~ target-html
<div class="container"><div class="target"></div></div>
~~~

Now we are starting to get somewhere! Looking at the implementation section, we've
finally got something that looks a little like something we'd want to use. It's
still a little verbose when it comes to the _usage_ of `greetingView`, but the
_definition_ of `greetingView` is reasonably tight, readable, and generic. Really,
it just follows the shape of the mutators themselves.

> # Aside
> It may feel awkward that views are given some ethereal "datumifier" function
> (what kind of name is that?) that resolves these vague references to data into
> things we happen to have sitting around. This situation will improve immensely
> once we get to the real framework.

A Quick Recap
=============

We've not really written that much code, but it encompasses a lot of big concepts.
Let's review what we have done so far.

* We created a mutator that idempotently applies some value to a target node.
* We created a concept called `Datum`, which is a box that contains some value
  that might change over time.
  * It has a facility `map` to generate a new Datum whose value is always some
    transformed (mapped) value of the current Datum.
  * It also has a facility `onChange` which can notify interested listeners every
    time the value actually changes.
  * With this Datum in hand, we taught mutator how to take a Datum and apply its
    databinding mutation behavior with the data in that Datum.
* Next, we realized that we can't really build reusable views out of our mutators
  until we loosen their tight binding with actual concrete Datums.
  * We still want to be able to reason about Datums (for example to explain _which_
    Datum we want, and perhaps to transform (map) its value) but we must do so
    without actually having one in hand.
* So we created another new concept, this time called `Predatum`.
  * A Predatum contains some vague _description_ of a data value we will eventually
    want. In our implementation, we left this description extremely broad.
  * It provides an interface to inject context, turning that vague description
    into a real piece of data&mdash;a real Datum.
  * It also allows mapping to be described _before_ that contextualization into
    a full Datum occurs. Those computations are stored away, and applied whenever
    the Datum is reified.
* We upgraded our mutators to understand Predatums, and reorganized their signature
  so that they followed a certain pattern.
  * We then took advantage of that unified pattern to create a simple reusable view
    system which combines many mutators together into a single entity.

Or, to put this another way:

* We created `Datum`, a way to _reason about values that might change over time_.
* We added to that `map`, a way to _perform computation on those values_ such
  that those computations always hold true.
* We then created `Predatum`, a way to _describe and reason about Datums that we
  don't yet have_. We did this in a way that retained the essential powers of Datum.
* We combined all of these to create `mutator`s and views that _reusably apply the
  results of these computations_ to some target.

And by the way, we performed this entire derivation through the lens of building
DOM mutators because it's an easy motivation to relate to and think through. Really,
as you'll see, the tools we've built through this process are useful for a whole
variety of computational tasks.

Janus
=====

It may not surprise you that we have just recreated two of the three coremost
facilities of Janus, as well as one practical application in the form of the mutator
system.

It may surprise you, however, just how close to the real versions of these things
we have come.

`Datum` in Janus is actually called `Varying`. It is much, much more powerful than
Datum: it can flatten a `Varying[Varying[x]]` to a `Varying[x]`, it can combine
multiple Varyings together into a single Varying given a pure multi-argument function,
it does a lot of work to perform these computations as lazily as possible, and
so on. But the essence is exactly the same: `Varying` is a box that contains a
value that changes over time, and a collection of tools to do meaningful computational
work with it.

> # Aside
> One somewhat popular aphorism on this subject is the phrase "you never step into
> the same river twice." The notion is that when we think about programming, we
> reason based on constant notions of things: this `Person`, that `Team`, and so
> on. But the reality, and the source of many of our woes, is that what we really
> manipulate in our code isn't the generalized, constant notion of a `Person`, it
> is some particular snapshot of that person at some instant in time. We think
> about the river, but what we actually manipulate is the water in the river at
> some given instant.
>
> This mismatch between reason and reality causes a lot of problems. What Varying
> does is give you a genuine way to talk about the river itself, and work with
> rivers in a generic, useful, usable way.

`Predatum` in Janus is a whole system called the `from`-chain. In spirit, it does
exactly what Predatum does. Again, it is in reality far more powerful: you can
combine multiple data requirements into a single computation, with transformations
on each one and the combination as a whole, for example. Importantly, it is also
more precisely defined than Predatum: it has a very concrete (but entirely extensible)
notion on how resources ought to be described and resolved into Varyings.

In fact, that extensibility system is what motivates the third and final coremost
Janus component, the one we haven't touched on here, which are case classes.

And lastly, mutators are extremely similar to what you just saw here. Just take
a look at the function signature of a [true Janus mutator](https://github.com/issa-tseng/janus/blob/master/janus/src/view/mutators.coffee) compared to what we did here:

~~~ noexec
// our example:
(selector, /* usage-specific parameters */) => (target, datumifier) => impure!

// janus:
(/* usage-specific parameters */) => (dom, point, immediate) => Observation
~~~

It's almost exactly the same. We don't take a selector here, there is a separate
system for that which works with mutators and views. `target` is named `dom`, and
`point` is just the actual name for `datumifier`. And we also take an `immediate`,
which for one thing is optional and for another provides some powerful functionality
we will cover later.

In fact, let's take a look at how we would assemble our last example above, but
using the most elementary Janus facilities. To avoid using some of the fancier
Janus tools, and to hew close to the comparative example, we begin by redefining
some "framework."

~~~
const mutate = (selector, mutator) => (dom, point) =>
  mutator(dom.find(selector), point);
const view = (...mutators) => (dom, point) => mutators.forEach(m => m(dom, point));

// implementation:
const greetingView = view(
  mutate('.target', mutators.text(from('greeting').map(x => x.toUpperCase(x)))),
  mutate('.target', mutators.classed('excited', from('greeting').map(x =>
    x.includes('!'))))
);

const greeting = new Varying('hello.');
const point = match(
  types.from.dynamic(of => {
    if (of === 'greeting') return greeting;
    else null; // again, handle other things..
  })
);
greetingView($('.container'), point);
greeting.set('yo!');
~~~
~~~ target-html
<div class="container"><div class="target"></div></div>
~~~

A Natural Consequence
=====================

Our hope by starting with this process is that you have some sense that Janus isn't
just a pile of features assembled together because we felt like it, and that it
isn't some massive machine whose internals you'd rather never look at.

Rather, we hope you get the feeling that actually these pieces are simple,
approachable, and in some sense inevitable from a simple set of wishes and requirements.
When you assemble an application in Janus, it is these extremely elementary tools
that you are constantly and directly working with: `Varying` and `from`, and case
classes and their friends.

Even `from` is really just a way to eventually get a `Varying`. And everything
else in Janus is just a different assembly or consumption of these three things.
Models and Lists are just containers of data that provide ways to get `Varying`s
out of them: `Model.get('somekey')` yields a `Varying`, for example.  Or `List.length`.
Views and templates are just facilities that understand how to receive these core
pieces and do meaningful work based on them, using the friendliest syntax we could
come up with.

Through it all, the one constant is the philosophy that computation should be
usefully expressible in extremely generic terms: that rules can be defined free
of specific references to specific objects, and even free of time itself.

By placing `Varying` at the center of everything we do, and building a system of
rules-based computation around it via `map`, we create an environment wherein all
you are ever doing is _describing how the program should be, always_. It doesn't
matter if the value changes. It doesn't matter if you don't have the value yet.
We aren't even reasoning about streams of values over time.

All that matters is the truth.

Next Up
=======

Take a break, perhaps. Stretch, do something else, maybe come back and skim this
one again just to be sure it all really does fit together. Now that you've seen
where the path leads, it may be helpful to review the steps again.

Then, since our overview and rationalization of our core components is done, it's
time to delve straight into the heart of it all, and [take a much closer look](/theory/varying)
at `Varying` itself. It'll be another long one, but things only get easier from
there.

