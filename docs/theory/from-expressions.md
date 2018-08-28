From Expressions
================

After with `Varying` and `case` classes, `from` chains form the final core component
of Janus. In our last two deep dives, we looked at how Varying lets you build
computations out of simple pure functions that work across the entirety of time,
and how case classes augment this capability by offering a value container type
that serves as a common language to communicate a _classification_ of a value
along with the value itself.

We also previously saw when we [rederived the core of Janus](/theory/rederiving-janus)
how we need one more puzzle piece in order to create generically reusable computations:
the ability to describe the inputs to our computations without directly referencing
those inputs.

We could certainly use a simple function-based interface to accomplish this task:

~~~
const magnitude = (x, y) => Varying.all([ x, y ]).map((x, y) => x + y);

const point = { x: Varying.of(28), y: Varying.of(45) };
return inspect(magnitude(point.x, point.y));
~~~

But this is an awfully concrete way to do things. Every time we want to use this
computation, we have to look up what it expects, and if the context is slightly
different we have to replumb it ourselves. It would be better if we could loosely
describe what resources we expect, and for all the relevant context to be given
later, closer to the data itself.

From Predatum to from-chain
---------------------------

In the rederivation, we created something called a `Predatum` to fill this role
(since we called Varying `Datum` back then). It did three primary jobs:

1. Remember a description of some piece of data. At the time, we just used a
   string for this description.
2. Allow mapping transformations to be recorded on top of the data. These eventually
   get applied to the Varying once we have one, but are inert until then.
3. Provide an interface, which at the time we called `datumify` but from here
   forward we will call `point`, which can take that description and yield a true
   Varying for it.

These steps remain exactly the same with `from` expressions. The changes lie in
the details of each step: for steps 1 and 3, we use a `case`-based system which
eliminates a lot of the looseness associated with just using plain strings, and
to fulfill step 2 for real Varyings, which [as we learned](/theory/varying) offer
quite a bit more functionality than the simple `map` we had with Datum, we have
a little more work to do.

So, let's jump right in; we will first cover `from` usage syntax, in a context
where the data resolution is done for us automatically. Then, we'll try to do
some resolution ourselves, and along that way we will learn what `from` is actually
doing under the covers and how to customize the entire process to suit your needs.

Using From Expressions
======================

`from` is a chaining interface. Let's see some really simple examples.

~~~
const dog = new Model({ name: 'Spot', age: 12 });

const name = from('name');
const dogYears = from('age').map(x => x * 7);

return [
  magic(dog, name),
  magic(dog, dogYears)
];
~~~
~~~ env-additions
return { magic: (subject, from) => from.all.point(subject.pointer()) };
~~~

So as not to distract you just yet with the specifics of actually performing a
`.point()` to feed data context to a from expression, we have resorted to calling
that operation `magic()` for now. `magic` is actually only 32 characters long, but
we'll get to that soon enough. In these examples, `magic` looks up the string we
provide to `from` as a key in the model it's binding against.

Importantly, these computational units can be thrown reusably at any context you
might need:

~~~
const dog = new Model({ name: 'Spot', age: 12 });
const person = new Model({ name: 'Jane', age: 34 });

const name = from('name').map(x => x + '!');
const dogYears = from('age').map(x => x * 7);

return [
  magic(dog, name),
  magic(dog, dogYears),
  magic(person, name),
  magic(person, dogYears)
];
~~~
~~~ env-additions
return { magic: (subject, from) => from.all.point(subject.pointer()) };
~~~

> By the way, `from`-chains are assembled additively, and so each stage is immutable.
> What this means is that you can reuse pieces of the chain without cross-interference:
> ~~~
> const name = from('name');
> const upper = name.map(x => x.toUpperCase());
> const lower = name.map(x => x.toLowerCase());
> ~~~
> In libraries where chains are recorded by mutating the original object, this
> arrangement would cause problems, with the two `map`s fighting. Not so with Janus.

Referencing Multiple Dependencies
---------------------------------

But what if you need to combine more than one resource in order to find an answer?
This is where the chaining really comes in:

~~~
const dog = new Model({ name: 'Spot', age: 12 });

const greeting = from('name').and('age')
  .all.map((name, age) => `${name} is ${age} years old.`);

const dogGreeting = from('name').map(x => x.toUpperCase())
  .and('age').map(x => x * 7)
  .all.map((name, age) => `${name} is ${age} dog years old.`);

return [
  magic(dog, greeting),
  magic(dog, dogGreeting)
];
~~~
~~~ env-additions
return { magic: (subject, from) => from.all.point(subject.pointer()) };
~~~

The `.and` keyword chains on a new `from` reference, while `.all` concludes the
chain, allowing you to `map` or `flatMap` all the referenced parameters down to
a single final value. Each individual chain can have its own series of maps on
it, and you can chain as many (flat)maps onto the `.all` final value as you'd like.

Mapping Helpers
---------------

It's not just `map`, either: you can use other methods available on `Varying`,
like `pipe`, as well as some other useful helpers `from` offers to help navigate
data structures:

~~~
const person = new Model({ name: 'Jane', age: 34 });
const dog = new Model({ name: 'Spot', age: 12, owner: person });

const relationship = from('name')
  .and('owner').watch('name').map(x => x || 'nobody')
  .all.map((name, owner) => `${name} is owned by ${owner}.`);

return [
  magic(dog, relationship),
  magic(person, relationship)
];
~~~
~~~ env-additions
return { magic: (subject, from) => from.all.point(subject.pointer()) };
~~~

Here, the `.watch` helper is [equivalent to writing](https://github.com/clint-tseng/janus/blob/7f81b0000c318de1bc6f9e5df4effa2b22f015c7/src/core/from.coffee#L27)
`.flatMap(model => (model == null) ? null : model.watch('name'))`, which is quite a
mouthful. This little bit of simple syntactic sugar helps save a lot of typing
and reading. Other such helpers are available; check the [API documentation](/api/from)
for more.

Reference Contexts
------------------

You may have noticed that despite promises to the contrary, we are still just
using strings to reference our requested resources. It helps a little that in these
samples, we have defined that these strings are references to keys on Maps/Models
we attach the `from` expression to.

But what if we want to reference something else? Like the model itself, or some
method attached to it?

~~~
class Dog extends Model {
  isYoung() { return this.watch('age').map(age => age < 7); }
}

const pack = new Model();
const chief = new Dog({ name: 'Chief', age: 12, pack });
const nutmeg = new Dog({ name: 'Nutmeg', age: 6, pack });
const jupiter = new Dog({ name: 'Jupiter', age: 8, pack });
const oracle = new Dog({ name: 'Oracle', age: 9, pack });
pack.set('dogs', new List([ chief, nutmeg, jupiter, oracle ]));
pack.set('leader', chief);

// given a dog, is it the leader of its pack?
const isLeader = from.watch('pack').watch('leader')
  .and.self()
  .all.map((leader, self) => leader === self);

// given a dog, do we consider it to be young or old?
const youngOrOld = from.varying(dog => dog.isYoung())
  .map(young => young ? 'young' : 'old');

return [
  magic(chief, isLeader),
  magic(chief, youngOrOld),
  magic(nutmeg, isLeader),
  magic(nutmeg, youngOrOld)
];
~~~
~~~ env-additions
return { magic: (subject, from) => from.all.point(subject.pointer()) };
~~~

So there are other methods available as alternatives to just calling `from` or
`.and` directly, and three of them appear to be `.watch()`, `.self()`, and `.varying()`.
We call these different toplevel methods **source cases**. But how do these terms
acquire meaning, where do they come from, and what does it mean when we don't
directly reference one and just call `from` or `.and` directly with a string?

To answer these questions, we'll have to demagick `magic`.

Pointing From Expressions
=========================

For various reasons, anchoring a `from` expression against a concrete context is
called pointing. You can picture this with the notion that you are giving the
abstract concept some point in physical reality to hang onto, or that you give
it a pointer to some reference, or indeed that you are simply pointing at the
thing you want it to work against. Any of these mental images work just fine.

First things first: let's swap out `magic()` for whatever it was secretly doing
and see what the code looks like.

~~~
const dog = new Model({ name: 'Spot', age: 12 });

const name = from.watch('name');
const dogYears = from.watch('age').map(x => x * 7);

return [
  name.all.point(dog.pointer()),
  dogYears.all.point(dog.pointer())
];
~~~

> `.point()` can only be called on a `from` expression _after_ `.all` has been
> called, so you need to ensure that ordering. But to make this easier, `.all`
> is available everywhere on the chain, even after `.all` has been called
> already&mdash;it'll just return itself with no modifications. So you can just
> call `.all.point()` at any time to safely point any from expression.

Okay, that wasn't actually very enlightening. At least we learned that pointing
is accomplished by calling `.point()` at the end of a `from` chain. But what does
it do, and what is `dog.pointer()`?

Perhaps what we need to do is implement our own `dog.pointer()` and see what it's
doing under the covers.

~~~
const dog = new Model({ name: 'Spot', age: 12 });

const name = from.watch('name');
const dogYears = from.watch('age').map(x => x * 7);

const pointer = match(
  types.from.watch(key => dog.watch(key))
)

return [
  name.all.point(pointer),
  dogYears.all.point(pointer)
];
~~~

Oh! It's a case class matching statement. Let's see a fuller example, with the
pack of dogs we met earlier, and their need for `watch`, `self`, and `varying`:

~~~
const isLeader = from.watch('pack').watch('leader')
  .and.self()
  .all.map((leader, self) => leader === self);

const isYoung = from.varying(dog => dog.isYoung())
  .map(young => young ? 'young' : 'old');

const pointer = (dog) => match(
  types.from.watch(key => dog.watch(key)),
  types.from.self(() => new Varying(dog)),
  types.from.varying(f => Varying.of(f(dog)))
)

return [
  isLeader.all.point(pointer(chief)),
  isYoung.all.point(pointer(chief)),
  isLeader.all.point(pointer(nutmeg)),
  isYoung.all.point(pointer(nutmeg))
];
~~~
~~~ env-additions
class Dog extends Model {
  isYoung() { return this.watch('age').map(age => age < 7); }
}

const pack = new Model();
const chief = new Dog({ name: 'Chief', age: 12, pack });
const nutmeg = new Dog({ name: 'Nutmeg', age: 6, pack });
const jupiter = new Dog({ name: 'Jupiter', age: 8, pack });
const oracle = new Dog({ name: 'Oracle', age: 9, pack });
pack.set('dogs', new List([ chief, nutmeg, jupiter, oracle ]));
pack.set('leader', chief);

return { pack, chief, nutmeg, jupiter, oracle };
~~~

So these methods, these source cases like `watch`, `self`, and `varying`, all have
their own semantics that we can rely on when defining computations with `from`,
and which `point` must fulfill when it sees them. All `dog.pointer()` does is return
a function that performs this task with `dog` as the focal point.

You'll notice that the `self` and `varying` handlers above take care to wrap their
results with a `Varying`. This is because they are allowed to change their mind
about what they reference; if something happens to change the meaning of
`from.watch(key)` or `from.self()`, they can swap out the contained Varying (the
one that actually carries the data value) for another one.

> Yes, because ultimately `from` is meant to yield a concrete `Varying`, this means
> that `from.point()` expects pointers to return a value of type `Varying[Varying[x]]`:
> The inner one carries the actual data value, while the outer one wraps it in
> case the referenced Varying changes.

These cases, each backed by their own semantic meaning, are how we layer some
precision on top of our wishy-washy string references: if strings are not all
equal&mdash;say, if some strings reference keys but other strings reference
something else&mdash;these case classes allow us to express some semantic on top
of the string (or really, any value type).

Here are all the [default source cases](https://github.com/clint-tseng/janus/blob/bc460e61109288ebbb96cc2188bc29c1c0e8588f/src/core/types.coffee#L6):

* `watch(key)` will watch the `key` of the target.
* `attribute(key)` will get the `key` [attribute object](/theory/model) for a Model.
* `varying(f|v)` will pass the target to `f`, which ought to return a Varying with
  the resolved data resource within it. Or, a Varying `v` can be directly supplied.
* `app(key?)` will get [`options.app`](/theory/app-and-applications) off the target
  if present, and optionally watches the given `key` on it.
* `self()` gives the target itself.
* `dynamic(key)` is what is called when `from(x)` or `.and(x)` are called directly;
  given a string it behaves like `watch`, and given a function it acts like `varying`.

Not all of these terms will make sense to you just yet. That's okay; we'll cover
each one again at an appropriate time. But for now, say that you don't like these
arbitrary definitions and you'd rather substitute your own. Luckily, Janus provides
a way to do exactly this.

Building a Custom From
======================

You'll notice that our fully-fledged implementation of `from` doesn't ever actually
understand anything about these data references that are created: only the `point`
function actually knows how to turn them into real Varyings. This is similar to
our original `Predatum` example&mdash;with both cases, the primary function of the
abstraction is to remember some description of data, allow mapping computations
to be chained on, and provide plumbing to turn the whole abstract computation into
a real working Varying.

As such, it doesn't actually matter what set of cases `from` works off of; all
it does is read the names and provide a method for each one, and eventually
those case class instances are run through `point`.

If you want to use your own set of case classes, use `from.build()`:

~~~
const cases = defcase('name', 'property', 'method');

class Dog extends Model {
  isYoung() { return this.watch('age').map(age => age < 7); }
  pointer() {
    return match(
      cases.name(() => this.watch('name')),
      cases.property(key => this.watch(`properties.${key}`)),
      cases.method(m => Varying.of(this[m]()))
    );
  }
}
const spot = new Dog({ name: 'Spot', properties: { age: 7 } });

const customfrom = from.build(cases);

return [
  customfrom.name(),
  customfrom.property('age'),
  customfrom.method('isYoung')
].map(from => from.all.point(spot.pointer()));
~~~

Here, we have defined our own set of concrete semantics: with the rigid model
structure we've created (perhaps as a result of some backend system limitation),
`name` is a special property that earns its own source case, while all other properties
are nested under `properties`, accessible via a source case whose handler scopes
down to the appropriate part of the model structure. Meanwhile, `method` will call
the given method on the model.

It's important to note that just like we have now created a new semantic for accessing
a Model even though we already had the default one, we also could back these new
semantics with some concrete data implementation that has nothing to do with Model:

~~~
const cases = defcase('name', 'property', 'method');

const name = new Varying('Spot');
const properties = { age: new Varying(7) };
const methods = {
  isYoung: () => properties.age.map(age => age < 7)
};

const customfrom = from.build(cases);
const pointdog = match(
  cases.name(() => name),
  cases.property(key => properties[key]),
  cases.method(m => Varying.of(methods[m]()))
);

return [
  customfrom.name(),
  customfrom.property('age'),
  customfrom.method('isYoung')
].map(from => from.all.point(pointdog));
~~~

In each of these cases, `customfrom(x)` won't work (go on, try it). This is because
the `name, property, method` set of cases doesn't define a `dynamic` case. `dynamic`
is special; it's what's called when `from()` or `.and()` are called directly. If
`dynamic` is not provided, that call is not available.

Our recommendation is that `dynamic` should not provide anything not otherwise
available via an explicit call; because it lacks an explicit label and thus must
define its own or infer context from the given value, we think it's better if its
usage is optional and overlaps with the explicitly named source cases.

We also feel that in common usage, it's unlikely you'll have a strong need to
define your own custom source cases: the ones provided by default in Janus are
pretty flexible. But the option is always there should you need to take it.

Recap
=====

That is, surprisingly, it. There isn't anything else to cover from a theoretical
standpoint, though it's likely you don't feel _entirely_ comfortable with these
things yet. Our advice is to just use them, in a variety of contexts, until you
at least feel comfortable using `from` expressions to represent different computations,
and then possibly to re-review this article to back that practical muscle with
a stronger theoretical grounding.

But some fancy tricks aside, there really isn't anything fundamentally more to
these things than we started with at the top of this chapter:

* `from` expressions take one or more descriptions of some data resource(s).
  * The `.and` operator allows multiple descriptions to be chained together.
  * These descriptions are housed in source cases, which carry their own semantic
    meanings.
* Each data resource, as well as the `.all` aggregate of all of them, may be
  transformed via `map`/`flatMap`.
  * Other useful helpers are available, like `.pipe` and `.watch`.
* The process of taking an abstract `from` expression and creating a bound version
  of it against some data context is called pointing, done by calling `.point()`.
  * `.point()` takes a function which resolves the source case classes and their
    contained descriptor values into concrete Varyings.
* You can use `from.build` to create a `from` backed by your own source cases and
  thus your own defined semantics.
  * It's then up to you to provide a pointer function that works with those cases.

Next Up
=======

Now that we have covered all the core pieces, we can start tackling their practical
agglomerations. We will start with the smallest one, the [mutators, templater, and
views system](/theory/views-templates-mutators).

