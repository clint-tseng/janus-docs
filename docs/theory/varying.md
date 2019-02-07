The Varying Monad
=================

At the very heart of Janus is `Varying`. Varying is a container type which can
house any value. It provides three important tools for dealing with the housed
value:

1. It take a value. It can return it, or call a callback when the value changes.
2. It can be given a mapping function, and return a new Varying whose value is
   always the mapped result of the value from the original Varying.
3. It can take a nested `Varying[Varying[x]]` structure and flatten it, so that
   you get back just a `Varying[x]`.

Some of you will recognize these three operations as fundamental laws of a certain
nature. Don't worry if you don't&mdash;all that matters is that together, these
three operations are quite powerful.

Varying has a couple of other tricks up its sleeve. We will discuss the process
of fusing multiple Varyings together later in this chapter. Later in this series,
we will cover ways to deal with resource management and garbage collection.

Here, we're going to cover the usage details, then move on to the underlying
mechanics; for more examples of usage, see the [practical guide](/hands-on/varying)
chapter on this subject.

For now, we will start with all the things you can do with a single Varying.

Creating a Varying
==================

There are two ways to create a new Varying.

~~~
const a = new Varying(4);
const b = new Varying(new Varying(8));

const c = Varying.of(15);
const d = Varying.of(new Varying(16));
const e = Varying.of(Varying.of(23));

return [ a, b, c, d, e ].map(inspect);
~~~

When you invoke the constructor with `new`, you will always get a Varying containing
the given value. `Varying.of`, on the other hand, will simply hand you back the
input value if it is already a Varying, or else it will do the same thing as the
constructor, wrapping the value in a Varying and handing it back.

> Those of you who dislike `new Varying(x)` syntax can use `Varying.box(x)` instead.

In reality, it will be rare that you manually construct a Varying. For the most
part, you'll be instead making use of Varyings that more advanced tools in Janus
give you, like `List.length` or `Model.valid()`.

Getting a Value
===============

One major way in which Janus differs from conventional Functional Reactive Programming
is that Varyings _always contain a value_. In most FRP approaches like [Rx](http://reactivex.io/)
and [ReactiveCocoa/Swift](https://github.com/ReactiveCocoa/ReactiveSwift), the main
Varying-like abstraction is more of a way to subscribe to and manipulate a stream
of values than it is a value-containing entity. In those approaches, you can have
one of these boxes in your hand but have no idea what its value might be until
you subscribe to it _and_ a new value comes along.

In Janus, if you have a Varying you have a value. This is similar to, for example,
[Mutable Properties](https://github.com/ReactiveCocoa/ReactiveSwift/blob/master/Documentation/FrameworkOverview.md#properties)
in ReactiveSwift.

There are two ways to get the value back out of a Varying. The first is simple:

~~~
return (new Varying(42)).get();
~~~

At any time, you can synchronously request the value and get it back. But while
there is a time and place to do this sort of thing, you shouldn't rely on `get`
too often. Instead, problem solving in Janus is usually best done by accounting
for all possible values over time:

~~~
const results = [];
const v = new Varying(1);
v.react(value => { results.push(value) });

v.set(2);
v.set(4);
v.set(8);

return results;
~~~

So `react` is the Varying equivalent of Datum `onChange` from the pretend framework
in [the previous chapter](/theory/rederiving-janus). In most cases, we prefer to
use `react` over `get`, because then we know that any time this value changes,
we are dealing with it appropriately. Again going back to that previous chapter,
if we are trying to apply some piece of data to the user interface in some way,
using `react` instead of `get` ensures that the interface is _always_ up to date.

One other thing you'll notice here is that the number `1` managed to sneak into
the result! This is because (again like our previous Datum example) calling `react`
will always immediately call your callback with the _current_ value. This again
fits with the philosophy of dealing with all points in time, _including the present
moment_.

If you are sure you don't need to immediately perform some action (for instance
if the initial value is known or unimportant), you can pass `false` as the first
parameter. This parameter is known throughout the framework as `immediate`; a
false `immediate` requests no callback for the immediate value.

~~~
const result = [];
const v = new Varying(1);
v.react(false, (value) => { result.push(value) });

v.set(2);
v.set(4);
v.set(4);

return result;
~~~

This time, the initial `1` value never shows up.

Notice this time that we set `4` twice and nothing happened! Again, this is because
we don't think of Varyings as being streams of values over time, but rather a
container type for some arbitrary single value. It would be weird to tell you
that the value changed, and then hand you the same value again!

So any time a Varying value is changed, it first performs a strict equality (`===`)
comparison on its extant value, and it will do absolutely nothing if they match.

> In practice, you'll find yourself writing `.react` quite seldom. Like most web
> frameworks, Janus provides the datamost and rendermost layers of your application,
> and you fill in your domain-specific logic in between. In Janus, this manifests
> physically in that you'll be doing tons of `map`ping of Varyings, but very little
> creation or reaction yourself.

Halting a Reaction
------------------

You can also stop a reaction in one of two ways. The first is the most widely used:

~~~
const results = [];
const v = new Varying(1);
const observation = v.react(value => { results.push(value); });
v.set(2);
v.set(3);
observation.stop();
v.set(4);
return results;
~~~

When you call `react`, you get back an `Observation` ticket whose primary job is
to give you some way to halt that reaction. There is a somewhat more direct way
to do this:

~~~
const result = [];
const v = new Varying(1);
v.react(function(value) {
  result.push(value);
  this.stop();
});

v.set(2);
return result;
~~~

Inside `react` callbacks, `this` is bound to the observation ticket itself, so
you can just call `this.stop()`. But this won't work with ECMA arrow functions,
because they don't rebind `this`. You'll have to use full `function` syntax.

> In Coffeescript or Livescript, however, `->` arrows _do_ bind `this`. So
> `varying.react(-> this.stop())` will indeed stop the reaction.

Mapping a Varying
=================

It's great that we can apply a result directly to some destination, but often
we need to do some kind of transformation work in advance to prepare the value.
We can just cram all of this work inside our callback to `react`, but what if we
want to reuse some of that work? Or worse, what if we aren't the ones actually
calling `react` (as you saw with our mutators in the previous chapter)?

Then we'll have to `map` the value. Again, we already covered this when we rederived
Janus, but there are some differences and additions that are worth discussing.

~~~
const a = new Varying(4);
const b = a.map(x => x * 4);

const results = [];
b.react(x => { results.push(x); });
a.set(6);
return results;
~~~

This much shouldn't be too surprising. But this might be:

~~~
const results = [];
const a = new Varying(4);
const b = a.map(x => { results.push(x); });

a.set(5);
a.set(6);
a.set(7);
return results;
~~~

Hey, what gives? Nothing happened! If my value is changing, why isn't my mapping
function getting called? How does `b` know what value it ought to have? In fact,
we know how to get a value. Let's see what happens if we use that:

~~~
const results = [];
const a = new Varying(4);
const b = a.map(x => x * 4);

results.push(b.get());
a.set(6);
results.push(b.get());
return results;
~~~

So at least that still works.

What's going on here is that Varying is as lazy as possible, and in certain places
this laziness assumes functional purity. Let's dig into that for just a moment.

Some of you may have been concerned after seeing [how we put Datum together](/theory/rederiving-janus)
about how haphazardly we were generating new pieces of computation and gluing them
together, without any hope of halting those computations. In reality, Janus is
quite careful about such things. It wants to perform as little work as possible
while still fulfilling its obligations.

So, until `get` or `react` are called, which are the only defined ways to actually
extract a value _out_ of a Varying, it assumes that you simply don't care what
that mapped value might be, and so it doesn't bother running the function. In
this sense, mappings on top of Varyings are really just descriptions of computation,
rather than active demands to perform some task. The demand only comes when that
value is needed.

As a result, functions handed to `map` _must_ be pure. A pure function is, among
other things, one that relies only on its inputs, and does nothing other than return
its output. (You can, for the most part, consider values from pure closure contexts
to be part of the input to the function). You can try to rely on `map` to perform
_impure_ actions&mdash;that is to cause side effects elsewhere, or to mutate the
inputs themselves&mdash;but it is dangerous to do so because you don't know for
sure when or if your mapping function will ever actually be run, or even how many
times it might be run when it is.

On the other hand, the nice thing about this approach is that it is (relatively)
free to _describe_ a computation: you can create `map`s left and right full of
complex expensive processing, knowing that they won't run until they must.

Flattening a Varying
====================

What does it mean to flatten a Varying? Consider the following practical situation,
where we end up with a bit of an awkward result.

List has a neat version of `.length` which gives you a Varying containing the live
length of that list at all times. What we are trying to do is to see if perhaps
it is too big.

> # Aside
> This is a good time to note that throughout Janus and this documentation, you
> will notice many pairs of methods and properties that share a name, except that
> one has an underscore (`_`) at the end, and the other does not; `.length` and
> `.length_` is an example; `.get(key)` and `.get_(key)` is another.
>
> In these cases, the version without the underscore will return a `Varying` whose
> value will always answer your question (`.length` returns a `Varying` whose Integer
> value is always the list length, for example), while the version with an underscore
> will give you a plain value that only answers the question at that moment (`.length_`
> just returns an Integer with the length of the list at the time it is called).

~~~
const quota = new Varying(10);
const items = new List([ 1, 1, 3, 8 ]);

const exceededQuota =
  quota.map(q => items.length.map(count => count > q));

return inspect(exceededQuota.get());
~~~

Shoot, we called `get` on our Varying, but instead of retrieving the useful result
we wanted, we got some other Varying back that was inside of it&mdash; rather
than yielding a `Varying[bool]` as we might have hoped, we have created a
`Varying[Varying[bool]]`.

Of course, part of the awkwardness here is how we nested `items.length.map` (which
yields a `Varying[Int]` inside of `quota.map`, but that's simply because we don't
yet know how to take two Varyings side-by-side and perform some simple work on
them at once, so we have to nest the two together like this. But either way, this
result doesn't really work; anybody trying to listen in to this result has to do
a lot of homework to get rid of that extra Varying that has snuck its way into our
output.

This is where flattening comes in. When a Varying `x` that contains a Varying `y`
is flattened, that new flattened Varying will always contain the same value as `y`,
even as `y` changes. If we set a new Varying `z` into `x`, the flattened result
will move over to track `z` instead. Maybe that was a bit confusing&mdash;let's
see this in action.

~~~
const results = [];

const odds = new Varying(1);
const evens = new Varying(2);
const choose = new Varying('odds');

choose
  .flatMap(which => (which === 'odds') ? odds : evens)
  .react(x => { results.push(x); }); // expect 1

choose.set('evens'); // expect 2
evens.set(4); // expect 4
odds.set(3); // expect no change; we're watching evens
choose.set('odds'); // expect 3
return results;
~~~

So when we call `flatMap` instead of `map`, what that means is that we want to
flatten the result of the mapping function. Let's see it in action on our original
example.

~~~
const quota = new Varying(10);
const items = new List([ 1, 1, 3, 8 ]);

const exceededQuota =
  quota.flatMap(q => items.length.map(count => count > q));

return inspect(exceededQuota.get());
~~~

Note how we only had to change the outer `map` to a `flatMap`; the inner one only
ever returns a `bool` so there is no reason to `flatMap` it. (But because this is
Javascript, where types are rather lax, it's totally okay to `flatMap` even if
you might not return a Varying. It's just better to be precise if you can.)

You could also `.map(…).flatten()`, or indeed just call `.flatten()` on any
Varying. But it's far more common to just use `flatMap`, because it's more natural
to immediately "fix" the result of a computation alongside the computation itself
than to try to figure out in some other place in your code whether you've gotten
a nested Varying or not.

One last note on flattening&mdash;it only works on one layer at a time. If you
have, for example, a `Varying[Varying[Varying[x]]]`, you'll have to call `flatten`
_twice_ before you get a `Varying[x]`.

Multiple Varyings
=================

Varying provides quite a few ways to deal with multiple varyings at once. The
most direct are `mapAll` and `flatMapAll`:

~~~
const results = [];
const x = new Varying(3);
const y = new Varying(6);

Varying
  .mapAll(x, y, (x, y) => x * y)
  .react(z => { results.push(z); });

x.set(5);
y.set(1);
return results;
~~~

If you prefer your `map` to actually be called `map`, there is a way to do that
(which of course also works with `flatMap`):

~~~
const results = [];
const x = new Varying(3);
const y = new Varying(6);

Varying.all([ x, y ])
  .map((x, y) => x * y)
  .react(z => { results.push(z); });

x.set(5);
y.set(1);
return results;
~~~

The truly functional nerd way to do this, though, is to use `lift`. Lifting is
a functional programming operation that takes some function that just deals with
plain values and returns a new "lifted" function that has been taught how to deal
with some particular kind of box that contains those values (in our case, Varying),
and returns a new box with the pure function applied to the contents:

~~~
const results = [];
const x = new Varying(3);
const y = new Varying(6);

const multiply = (x, y) => x * y;
const multiplyVaryings = Varying.lift(multiply);

multiplyVaryings(x, y).react(z => { results.push(z); });
x.set(5);
y.set(1);
return results;
~~~

The one thing you'll note about all these examples is that they always reduce the
multiple parameters down to a single output value _before_ we `react` on them.
This is a pretty natural result of the facts that functions only return one value,
and Varyings only store one value. But if you are doing something complicated and
expensive (like rendering some canvas graphics, say) and you just want to apply
some mutation every time any one of several inputs change, `Varying.all` has the
answer for you:

~~~
const results = [];
const x = new Varying(3);
const y = new Varying(6);

Varying.all([ x, y ]).react((x, y) => { results.push(x * y); });

x.set(5);
y.set(1);
return results;
~~~

Underlying Mechanics
====================

Now that we've discussed _what_ these features are, we should address how it is
they actually work. In the extreme majority of cases, these details shouldn't matter.
But if you're pushing the framework to its limits, or you're working on the internals,
this knowledge will be important.

If you're not really here to learn that sort of thing, it's totally okay to skip
this section entirely and jump on ahead to the [Recap](#recap) below. On the other
hand, these subtleties are about as weedy as Janus gets, so if one of your goals
is to risk-assess the darkest corners of the framework, this is the place to be.

Change Propagation
------------------

The first topic here is the nature of change propagation.

We like to pretend that time doesn't exist in Janus-land, but every form of
functional programming is a lie if you dig deeply enough, and we sadly do have
to push changes out one at a time. The way this works out is that first-registered
reactions will fire first when changes occur. This behavior is not customizable
nor parameterizable: any code that depends on the particular order of propagation
is dangerous and should be rewritten.

Perhaps more interesting is what happens when change waves overlap each other.
The next example is not exactly _advisable_ code, but it does demonstrate the
problem.

~~~
const results = [];
const v = new Varying(2);

// coerce v to an integer always:
v.react(x => { v.set(Math.round(x)); });

v.react(x => { results.push(x); });

v.set(3.5);
return results;
~~~

At first, this may not seem too surprising. In fact, it looks like the most
desirable outcome. But two subtleties are at work in this sequence of events.

The first is that we registered the `results.push` reaction _after_ the coercion.
If we hadn't, our results would also include an intermediate `3.5` result. This
is scary, yes, but remember again that this is a rather degenerate code sample,
and that the final result is still correct.

The second subtlety is that we don't also see a `3.5` _after_ the `4`. Why would
you? Consider the underlying sequence of events, and how the change might be
carried out:

1. `a` is set to `3.5`. It knows it must call `react` handlers 1 and 2.
2. `react` handler 1 is called with `3.5`.
   1. `a` is therefore set to `4`. It knows it must call `react` handlers 1 and 2.
   2. `react` handler 1 is called. It tries to set `4` again so nothing happens.
   3. `react` handler 2 is called. It pushes `4` to `results`.
3. `react` handler 2 is called with `3.5`.
   1. `3.5` is therefore pushed to `results`.

This doesn't seem so bad, necessarily. That `3.5` _did_ happen at some point,
after all, so it seems natural that it should show up in the results array. But
two things make this an unacceptable result. The first is that as far as `results`
are concerned, because it sees the values in reverse order, `3.5` is _the final_
canonical result.

This becomes a big problem once we learn how Varyings actually perform mapping
in the following section: eventually, to fulfill `map`s, Varyings will `react`
on their mapping source. So any mapped Varyings chained off this one would carry
the wrong result.

And so each Varying keeps track of which wave (internally called `generation`)
of value propagation it is currently sending out. If at any point it senses that
it is about to repropagate an old wave, it bails out. So at step 3 in the above
list, when `react` handler 2 is about to called with `3.5`, our actual Varying
sees that it has already sent out `4`, which is a newer value, to all interested
parties, and so it halts.

Map Execution
-------------

The next mechanic to cover is the true nature of `map`. As previously mentioned,
Varying will not bother running `map` functions or carrying values unless it
absolutely must. (By the way, this is part of why we make people call `.get()`
instead of offering direct access to some `value` property&mdash;we might have
to do work to answer the question.)

But we've also previously mentioned that the _only_ ways to get values out of a
Varying are `get` and `react`. There is no super-secret backdoor (yet) that Varying
uses to snoop on its mapping source.

So what a mapping-result-Varying (henceforth referred to as a `MappedVarying`)
actually does is wait around until someone comes along and `react`s on it. When
that happens, it itself `react`s on its source Varying, with a callback that maps
the result and applies it to itself. This way, if a whole chain of Mapped Varyings
are strung together, starting a reaction causes a series of `react`s in turn all
the way back to the Varying source. The opposite is also true: when a Mapped Varying
no longer has any reactions on it, it stops reacting on its source Varying.

A `flatMap`ped Varying is quite similar, except that when it sees a Varying come
through after mapping, it will `react` on _that_ Varying to track its inner value.
Then, if some new value comes along to replace that inner Varying, it makes sure
to stop reacting on the old one. This way, we are sure to stop work that is no
longer needed.

> # Aside
> Actually, `map`, `flatMap`, and `flatten` are all implemented in a single place,
> as `FlatMappedVarying`. Internally, there's a flag that tracks whether to flatten,
> and there is _always_ a mapping function&mdash;`flatten` just assigns `identity`
> as the mapping function which passes the inner value through unchanged.

Other Advanced Features
=======================

We haven't covered everything here. Later on, we'll talk about [using `Varying.managed`](/theory/resource-management)
to manage the creation and disposal of expensive resources when needed.

We also haven't covered cases in which Varying _shouldn't_ reflect truth at all
times&mdash;for instance, if you want to debounce an input so it doesn't fire
some handler too frequently:

~~~
const debounce = (interval, varying) => {
  const result = new Varying(varying.get());
  let timer = null;
  varying.react((value) => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout((() => result.set(value)), interval);
  });
  return result;
};

const v = new Varying(4);
const output = debounce(2000, v);

v.set(8);
v.set(15);
v.set(16);
v.set(23);
v.set(42);

return [ v, output ].map(inspect);
~~~

Of course, it would be nice if the debounced varying were lazy, just like a Mapped
Varying would be, not actually doing any work until it knew it was needed. And,
while this is a neat trick, it doesn't really entail any new core functionality,
so why cover it here?

The first question involves the `Varying.managed` resource management feature we
mention at the top of this section. The second touches on the Janus Standard
Library, which offers a small pile of useful transformers like this one, and
`throttle` or `filter`. To help with using these, we introduce an incredibly
simple helper method `.pipe(f)` which just returns `f(this)`:

~~~
const { debounce } = stdlib.varying;
const v = new Varying(4);
const output = v.pipe(debounce(2000));

v.set(8);
v.set(15);
v.set(16);
v.set(23);
v.set(42);

return [ v, output ].map(inspect);
~~~

As you'll see when we talk about `from` later on, having this standard interface
and making `debounce` currying (that is, it is willing to take just the interval
at first, then take the varying later with a second call) will allow us to express
complicated transformations with ease.

Recap
=====

That was a whole ton of reading. Here's a quick reminder of what we've just covered:

* Varyings contain a value that might change over time.
* You can `get` the value of a Varying at any point in time, or `react` on it to
  do some action every time it changes.
  * Calling `react` on a Varying gets you a ticket that you can use to terminate
    the reaction.
* You can also `map` a Varying, which gives you a new Varying which always contains
  the original value mapped by your function. Use `flatMap` if your function might
  itself return a Varying.
  * Functions given to `map` and `flatMap` must be pure.
  * If you have many Varyings, all of whose values you need in order to compute
    some result, you can use `Varying.all`, `.mapAll`, `.flatMapAll`, or `.lift`.
* In translating these ideas to reality, there are some practicalities that surface
  as subtle behavior, like the order in which values propagate. But Varying does
  its best to patch things together in a predictable, straightforward manner.
* And internally, all a Mapped Varying does when `react`ed is call `react` in turn
  on its own source value parent, and so on up the line.

That's the hardest stuff. We went into relatively excruciating detail here
because&mdash;well, for one, you signed up for it, but also&mdash;this knowledge
here forms the base for everything else we are going to do in Janus. Once we get
through the core concepts, very little will look unfamiliar at all: we are going
to talk about things like Maps and Lists and Models, and these things will all
look exactly like you would expect, just flavored by the existence of Varying.

Next Up
=======

So, take another moment. Make sure you're comfortable with the ideas presented
here. Go back and play with some of the examples. Come up with practical scenarios
and boil them down into little values you can play with and string together.

When you're feeling ready, we'll cover the second of the three coremost Janus
concepts, which are [case classes](/theory/case-classes). Don't worry, they're
basically just fancy `enum`s that can contain a value.

