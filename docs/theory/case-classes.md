Case Classes
============

It is not necessary to understand case classes in order to use Janus. In fact,
the practical guide doesn't even directly cover them, only some situational
applications. But they are a useful tool you can employ when you'd like, and they
are a big part of the framework's extensibility mechanisms.

Motivations
-----------

In Scala, where Janus case classes were pulled from, case classes are powerful
tools for making sense of data: they allow you to reason very efficiently and
flexibly about the classification and structural content of related data objects.

One problem case classes are particularly effective at solving, and one that is
often awkwardly handled in Javascript, is the common situation wherein a result
needs to encode a _type_ of result (success or failure, for instance) along with
a value _related to_ that result type (the response body or the error, perhaps).
Other examples would be `nodes` versus `leaves` of a tree, each of which might
contain data, or `bool` vs `string` vs `number` vs `object` vs `array` when pulling
a JSON string apart.

Typically, a Javascriptian approach would involve duck-typing (checking that the
value has some pre-agreed property assigned on it), or a multi-argument callback
argument structure (eg the Node.js `(error, result) => …` standard signature).
The Janus approach looks more like this:

~~~
const { success, failure } = types.result;
const handle = match(
  success(x => x * 3),
  failure(e => e.message)
);

return [
  handle(success(14)),
  handle(failure(new Error('Something went wrong!')))
];
~~~

The advantage of this approach is that it gives a standard language in which
disparate components of the software stack can communicate and reason about the
classification of some input or result, without restricting what the value itself
must be or how it must be passed around. Janus leverages this in two primary ways:

1. By providing some standard case classes like `success` and `failure`, framework
   components like the network request caching layer can snoop on the request result
   and understand how and whether to cache the result value, without any custom
   implementation by the application developer, and without the framework needing
   to understand details about the value.
2. By accepting case classes in the construction of framework components, and
   using them as a standard way to resolve framework behavior, we can offer full
   extensibility on core framework interfaces. The `from` facility that you have
   seen some of, for example, and which we will cover in the following chapter,
   has a chaining interface defined by a set of case classes.

This will make more sense as we put these things to use. First, we will demonstrate
how to define new case classes, then cover various ways to `match` as shown above,
before moving on to some of the useful tools case class instances provide independent
of matching. Lastly, we will discuss some advance features and usage, which will
involve a quick look at case class internals.

> # Aside
> As of initial release, Janus core is still written in Coffeescript. While this
> may change eventually, the present case classing system is constructed to yield
> very pleasant syntax in Coffee:
>
> ~~~
> match(
>    success (x) -> x * 3
>    failure (e) -> e.message
> )
> ~~~

Case Class Fundamentals
=======================

Janus provides some case class definitions out of the box, like the success/failure
ones you saw in the example above. But you can always define your own, and then
use the same matcher you saw above:

~~~ manual-require
const { Case, match } = require('janus');
const { red, blue, green } = Case.build('red', 'blue', 'green');

const colorToString = match(
  red(x => `red: ${x}`),
  blue(x => `blue: ${x}`),
  green(x => `green: ${x}`)
);

return [
  colorToString(red(42)),
  colorToString(green('test'))
];
~~~

As you can see, the inner value can be anything; all `match` really cares about
is which of the colors you've given it.

You can also see that the same `red`, `blue`, and `green` functions are used to
specify a matching behavior, as well as construct a new value of that classification.
This is just to make the syntax more pleasant and reduce the amount of incantation
memorization involved with learning Janus&mdash;it's not any sort of profound
mathematical statement.

There is also an `otherwise` function that specifies what to do if none of the
other matches succeeded. But you do not get access to the contained value in this
case, you get the case class instance itself.

~~~
const { success, failure, progress } = types.result;

const handle = match(
  success(x => `success: ${x}`),
  otherwise(c => c.toString())
);

return [
  handle(success(42)),
  handle(progress('halfway!')),
  handle(failure('test'))
];
~~~

Sometimes, you will want to perform some action in the event of some particular
class, and the full `match` syntax would be a hassle in these cases:

~~~
const { success, failure } = types.result;
const result = success(14);

return [
  success.match(result),
  success.match(result, x => x * 3),
  failure.match(result),
  failure.match(result, x => x * 6)
];
~~~

Each case has a `.match` method which takes one or two parameters. If only the
instance is given, it will return a boolean indicating whether it matched. If a
function is also given, that function will be called with the inner value only
in the case of a match.

A Practical Example
-------------------

Just to ground these features in a real-life scenario, here we present an actual
usage example from within Janus.

As you'll see later on, Models in Janus can have behavior associated with particular
data properties, and one of those behaviors allows you to reference data elsewhere
over a resource request (eg by making an HTTP request). This can be useful when,
for instance, fetching the Friends for some Person, or the Listing given some
search parameters, on demand.  Janus doesn't actually implement or understand
anything about such requests, nor does the application developer have to handle
the specifics of data flow: by using case classes as a communication medium, the
framework can concern itself with just data flow, and the application developer
needs only to define how a given data property ought to be turned into data.

To make this happen, Janus needs to be able to understand when a result arrives,
and whether that result is something it should assign to the actual model as a
real data value. The first part&mdash;the when&mdash;is easy; we already have a
construct that lets us reason about changing values over time, and that is `Varying`.
And the second part can be solved by using the `types.result` case class we've
been using in these examples, with `success` and `failure` [and others](https://github.com/issa-tseng/janus/blob/bc460e61109288ebbb96cc2188bc29c1c0e8588f/src/core/types.coffee#L8).

Putting these two solutions together, we end up with a value type `Varying[types.result[x]]`.
We can allow extraordinary flexibility in how applications implement their fetching
code, because the _only_ thing we require is that we get one of these things in
return.

And indeed, the fact that we like to use `Varying` as our fundamental primitive
wherever possible is a big part of why case classes are important: the Node.js
style callback signature `(error, result) => …`, for instance, doesn't harmonize
very well with Varying: it is unclear how to map a callback with two arguments
onto a data structure with a singular data value. We would rather have something
that looks more like a value type. But we would also rather not resort to duck-typing:
we'd like to be more precise than that, since such approaches end up devolving
to conventions and incantations.

So, here's an example of what that request resolution code might look like. First,
we'll see how in application code an implementer might create a network request
handler:

~~~ noexec
const getResource = (path) => {
  const result = new Varying(types.result.pending());
  fetch(path)
    .then((response) => response.json())
    .then((data) => { result.set(types.result.success(data)); })
    .catch((error) => { result.set(types.result.failure(error)); });
  return result;
};
~~~

And here's a minorly simplified look at how Janus does the work of actually handling
that result value:

~~~ noexec
const { success, complete } = types.result;

const result = /* calls application fetching code */;
result.react(function(resultCase) {
  success.match(resultCase, (caseInner) => { model.set(key, caseInner); });
  complete.match(resultCase, () => { this.stop(); });
});
~~~

If the `Varying` value is a `success` type case, we assign the value within that
case to the appropriate key on the model. If it is a `complete` type case, we stop
the reaction entirely, as there is nothing more to be done.

> It turns out that `complete` is a case superclass, which will match both `success`
> as well as `failure`. We'll talk more about those in the [Advanced Case Classes](#advanced-case-classes)
> section below.

Here, case classes enable a clean, easy-to-remember interface point between application
data request code and framework data flow code. Many approaches could be taken
to define such an interface, but because Janus itself is very value-oriented (due
in large part to its centering around `Varying`), this approach of adding semantic
meaning to values plays well to the many tools offered by Janus. In the next section,
we will talk about some of the case class-specific tools.

Manipulating Case Classes
=========================

Now that we've seen the basics of defining, instantiating, and directly matching
on case classes, as well as a motivating example showing how these operations can
be useful, it's time to cover some of the other ways you can work with case classes.

There are three methods that every case class instance provides that help you
identify and manipulate them without directly matching: `xOrElse`, `getX`, and
`mapX`, where `x` in each case is the name of a case in the set.

So if we define a case class set `Case.build('even', 'odd')`, for example, _every_
case class instance will have the methods `.evenOrElse` and `.oddOrElse`, and
likewise for `getEven` and `getOdd`, and `mapEven` and `mapOdd`.

The `xOrElse` and `getX` methods help you directly extract values: `evenOrElse`,
for example, will give you the value within the instance only if it is an `even`
type, or else it will give you the value you specify. `getEven` does the same,
but will simply return the original case class instance unless it is `even`.

~~~
const { even, odd } = Case.build('even', 'odd');

return [
  even(42).evenOrElse(0),
  odd(17).evenOrElse(0),
  even(42).getEven().toString(),
  odd(17).getEven().toString()
];
~~~

The `xOrElse` methods are useful for definitively extracting a value out of a
case class, eliminating the case class wrapping type entirely. The `getX` methods,
meanwhile, are effective when feeding values into type-aware systems, like the
Janus view renderer: `.getSuccess()` would give you the actual success value, which
the renderer would dutifully draw on screen; otherwise it will give you, for instance,
a full `progress('42%')` case instance. If the renderer has been taught what to
draw any time a `progress[x]` case class is seen, like a spinner or progress bar,
then by manipulating the data type using `.getSuccess()` you have taught your
application how to manage loading periods.

The `mapX` methods take a mapping function, and will never affect the enclosing
case class type. It will map the inner value only if it is of the specified type.

~~~
const { even, odd } = Case.build('even', 'odd');

return [
  even(42).mapEven(x => x * 2),
  odd(17).mapEven(x => x * 2),
  even(42).mapOdd(x => x - 4),
  odd(17).mapOdd(x => x - 4)
].map(c => c.toString());
~~~

Mapping like this is very useful when your code isn't doing the final extraction
of data, but you have some transformations you need to do on the inner data in
particular cases; deserializing a successful network request value into an actual
`Model` instance of some type, for example (`result.mapSuccess(Foo.deserialize)`).

Case Superclasses
=================

Case superclasses let you create umbrella cases that will match any of their subclasses.
They are specified when the case class set is defined.

~~~
const color = Case.build('purple', {
  warm: [ 'red', 'orange' ],
  cool: [ 'blue', 'green' ] });

const appetizing = match(
  color.warm(() => 'yes!'),
  color.cool(() => 'no...'),
  otherwise(() => 'not sure.')
);

return [
  appetizing(color.red()),
  appetizing(color.green()),
  appetizing(color.purple()),
  appetizing(color.warm()),
  appetizing(color.cool())
];
~~~

As you can see, `purple` is not a part of any case superclass. But the other colors
have been assigned `warm` or `cool` as appropriate, and these are the monikers
we use to actually match on.

The main limitation of case superclasses is that they may be used _only_ to define
matches in `match` blocks. They cannot be constructed as value-carrying instances,
and mapping functions (like `mapWarm` in this case) will not be generated. If you
do construct a case superclass value, it will stubbornly do nothing, not even match
`otherwise`, as you can see above.

Case superclasses can nest: just continue nesting objects and you can build a full
hierarchy.

Recap
=====

Case classes in Janus are a stripped down version of their Scala counterparts.
While they do not provide as many tools for destructuring and manipulation, they
still exist in the framework for two primary reasons:

1. To allow very flexible interfaces between the framework and application code,
   using value types within `Varying` to express operation inputs or results.
2. To create a language with which to add extensibility to the framework.

This latter application you haven't seen yet, but you will in the following chapter
on `from`-chaining; indeed, this chapter is presented first as a prerequisite.

Using case classes involves defining sets (or using Janus default sets), instantiating
instances, and using the matcher or the various manipulation tools to help process
those instances:

* `Case.build('even', 'odd')` defines a set of cases. The `types` namespace within
  the Janus export contains default Janus sets.
* `even(x)` will put `x` in a case class of type `even`.
* The resulting instance will have methods `getEven`, `getOdd`, `mapEven`, `mapOdd`,
  `evenOrElse`, and `oddOrElse`, which can help transform or extract values in
  particular cases.
* But when trying to deal with many types of cases at once, `match` is the most
  effective tool.

You probably won't find yourself reaching for case classes _that_ often. But when
they suit a task, they do so particularly well. You'll see one such case in the
following chapter.

Next Up
=======

In the next chapter, we will cover the last of the three Janus core tools: `from`-chaining.
If you recall our earlier [rederivation of Janus](/theory/rederiving-janus#datum-indirection)
from basic primitives, from chains are the equivalent of the `Predatum`s we created
there, which allow computational inputs to be declared without directly referencing
them, and later fulfilled with some concrete reference.

You may also recall that we warned at the time that from chains are much more
advanced than the vision we offered then. Don't worry&mdash;they are not hard to
understand, and by learning the basics of case classes first, you've done some
of the hardest work already.

So, let's [get to it](/theory/from-expressions), then.

> If you're not feeling rock solid on case classes, it may not be the worst idea
> to simply press on, and come back to this chapter after reading the next one.

