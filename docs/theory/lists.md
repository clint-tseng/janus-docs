Lists
=====

You've already seen quite a few `List`s so far. We've tried not to do too much
with them besides create them, but as you might have expected, Janus's take on
these data structures (and indeed, the reason it bothers to reimplement them at
all) offers data transformations like `map` that, once declared, are respected
and upheld throughout time as your data changes.

And as we get into Maps and Lists, it's relevant to note that while we try to
imbue that spirit into these structures, we will necessarily start to stray a
little from resolutely using `Varying` for everything. After all, Varying is a
box intrinsically built to represent a single value throughout time, and a box
that structures multiple values together across all of time will necessarily
require some other treatment.

But seen from a different perspective, the same general rules will apply: when
some transformation is defined on some Map or List, the resulting Map or List
will apply that transformation across all of time. In fact, it will be relatively
common that you end up mapping eg `Varying[List[x]]` to another `Varying[List[x]]`
with code that looks something like this:

~~~
const v = new Varying(new List([ 1, 2, 3, 4, 5 ]));
return v.map(l => l.map(x => x * 2));
~~~

This way, we retain our fundamental property that we account for all values for
all of time: the mapped list will ensure that our `x * 2` rule always holds for
the transformed list, and we wrap that in a Varying to ensure that if our reference
changes&mdash;if we start talking about a different list altogether&mdash;that
we are still computing the correct result.

> There _is_ actually an important difference, at least in this early version of
> Janus: Maps and Lists perform their transformations _eagerly_. Unlike Varying,
> which doesn't do any work unless it has to, Map and List don't (yet) carry this
> same property.

So, bear that in mind as we dive in and start poking around Lists, Maps, and Models.

First, we'll talk about some (but not all) of the basic manipulation operations
on Lists. You can find a full listing in the [API Reference](/api/list). Then,
we'll briefly overview some of the transformation options available for Lists
before diving into how they actually work behind the scenes. We'll then close
on `Enumerable`, `Traversal`, and how Lists and Maps relate to each other.

List Basics
===========

You can create a List with one or many elements.

~~~
return [
  new List(),
  new List(42),
  new List([ 4, 8, 15, 16, 23, 42 ])
].map(inspect);
~~~

You can also `@deserialize` a List from plain data. The `@modelClass` class property
can be defined to instantiate all elements as some classtype. The Model class must
also have a `@deserialize` (`Model` does).

~~~
const Person = Model.build();
class People extends List {
  static get modelClass() { return Person; }
}

return [
  List.deserialize([ 20, 48 ]),
  People.deserialize([ { name: 'Dolores' }, { name: 'Maeve' } ])
].map(inspect);
~~~

There's a shortcut for this lengthy definition:

~~~
const Person = Model.build();
const People = List.of(Person);

return inspect(People.deserialize([ { name: 'Gertrude' }, { name: 'Alice' } ]));
~~~

Once constructed, a vast array of List manipulation tools is available. Here we
cover some of the most commonly used:

~~~
const list = new List([ 0, 1, 2, 3 ]);

list.add(4); // adds at the end.
list.add(0.5, 1); // or, specify an index.
list.add([ 1.33, 1.67 ], 2); // add multiple elements at once.

list.remove(1.67); // remove by === comparison.
list.removeAt(0); // or remove by index.

list.move(1.33, 2); // move by === comparison to an index.
list.moveAt(2, 1); // or move by index to index.

list.put(1.5, 2); // put a value to an index.
list.set(2, 1.5); // set an index to a value. (whichever you prefer)

return list;
~~~

By default, the Janus API assumes you care more about things than structures&mdash;that
is, that you're more likely to be manipulating Lists by their contents than by
way of its indices&mdash;and so all the base methods take references to List
members rather than indices to operate on. But add `At` to these methods, and
it'll happily take an index instead.

`.put` and `.set` do the same thing (in fact, `.set` delegates to `.put` to actually
do the work); `.set` mostly exists to harmonize with Map, which also has a `.set`
method.

You see the same thing with `.get` as we cover item retrieval:

~~~
const list = new List([ 0, 1, 2, 3 ]);

return [
  list.at(2), // get by index,
  list.get(2), // or get by index.
  list.watchAt(2), // or, watch the value at an index.
  list.watchAt(-1), // you can count from the end
  list.at(-1), // with any of these methods.

  list.length, // get the list length
  list.watchLength() // or watch the list length
].map(inspect);
~~~

We also implement the iterator protocol, so if you are using ES6 you can directly
loop on Lists using `for..of`:

~~~
const list = new List([ 0, 1, 2, 3 ]);

let result = 0;
for (const x of list) result += x;

return result;
~~~

But none of this is what we're here for. Let's get into List transformations.

List Transformations
====================

Janus Lists support a variety of common array-like operations, all of which
automatically preserve their transformation properties as the source List(s)
change.

~~~
const xs = new List([ 0, 1, 2, 3 ]);
const ys = xs.map(x => x * 3);

xs.add(4);
xs.removeAt(0);

return inspect(ys);
~~~

Of course, `.flatMap` is possible, and as usual it refers not to the flattening
of Lists but rather the possibility of mapping to a Varying return type:

~~~
const xs = new List([ 0, 1, 2, 3 ]);

const factor = new Varying(2);
const ys = xs.flatMap(x => factor.map(factor => x * factor));

xs.add([ 4, 5 ]);
factor.set(5);

return inspect(ys);
~~~

But other common operations are available, too, and their parameters all accept
Varying inputs:

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);

const take = new Varying(2);
const taken = list.take(take);
take.set(4);

const lookFor = new Varying(3);
const index = list.indexOf(lookFor);
lookFor.set(5);

const filterMod = new Varying(3);
const filtered = list.filter(x => filterMod.map(mod => (x % mod) === 0));
filterMod.set(2);

return [ taken, index, filtered ].map(inspect);
~~~

See the [API Reference](/api/list) for a full accounting, but among the operations
we have not covered here are `.concat`, `.flatten`, `.uniq`, `.includes`, and `.any`.

Fold-like Operations
====================

Some of the operations mentioned above are fold-like already: `.indexOf`, for
example, returns a single value derived from the list as a whole, as does `.any`.
There are others available, like `.sum`, `.min`, and `.max`, which perform simple
logic and math and are easy to optimize. These operations can be used unreservedly.

But fully-fledged `.foldl` (sometimes called reduce) is harder to optimize. Because
it operates in a particular order, typically left-to-right, it implies a sequence
of operations as long as the list itself, each dependent on the output of the
previous. It also means that changes to elements early in the sequence order cause
potentially sizable recomputations, as the knock-on effects cascade all the way
through the list.

Compound this with the common practice (even within Janus Lists themselves, as
in multi-element `.add`) of bulk-updating lists an element at a time, left-to-right,
and innocuous-looking list manipulation code can cause major performance problems.

In general, performant List folding is the last major unsolved problem in Janus
at the time of writing. There are many issues to be solved and optimizations to
be made throughout the framework, but in this area lie the only questions to which
we have no satisfactory answers. Laziness and transducers can improve the performance
of List transformations in general, and there are plans to pursue these approaches.
But for fold, we have nothing just yet.

For smallish Lists, `.fold` is perfectly serviceable:

~~~
const list = new List([ 1, 2, 3, 4 ]);
const product = list.foldl(1, (x, y) => x * y);
list.add(5);
return inspect(product);
~~~

But Lists that experience frequent updates or contain many elements (hundreds,
typically), can be dangerous under `.foldl`. In our experience, these kinds of
computations are rare in typical Janus work. When they come up, they can usually
be solved by tapping directly into List internals.

List Internals
==============

All of the List transformations provided as a part of Janus work by communicating
changes with events. It's old-fashioned, but it enables efficient eager updating
of List transformations. There are three events total.

* `added` indicates that an element has just been added to the list. Two arguments
  are provided with the event: `elem` is the element itself, and `idx` is its new
  index.
* `moved` indicates that some element has just moved within the list. Any elements
  between its old and the new indices shift accordingly, and all other elements
  remain in place. Three arguments are given: `elem`, `newIdx`, and `oldIdx`.
* `removed` indicates that some element was just removed from the list. Two arguments
  are given, `elem` and `oldIdx`.

Behind the scenes, all Lists have a `.list` property, which is an array backing
the structure. The `.list` has, at all times, an accurate representation of the
List data.

Let's put all of this in practice and, in continuation of the previous section,
implement our own fold which sums all the numbers in a list. Janus provides one
of these, and it's done a lot like it is here but with more resource management
magicks.

~~~
const sum = (list) => {
  // get an initial sum of the list, populate our result.
  let initial = 0;
  for (const x of list) initial += x;
  const result = new Varying(initial);

  // respond to list changes:
  list.on('added', (x) => { result.set(result.get() + x); });
  list.on('removed', (x) => { result.set(result.get() - x); });

  return result;
};

const list = new List([ 2, -3, 4, -5, 6 ]);
return inspect(sum(list));
~~~

Here, we do a bit of work to compute our initial value by directly iterating over
the list (were we to avoid ES6 iterators we could use `list.list` to get the backing
array of the List), and then all we have to do is adjust the sum one delta at a
time each time the List changes. There is no event for a value changing in-place;
this is modeled in the events as the old value being removed and the new one added.
And, we don't care when computing the sum of the list the relative positions of
the values (addition is commutative), so we never bother with the `moved` event.

This, of course, means we've cheated a bit with this example: the motivation we
gave in the previous section was precisely the case wherein order _does_ matter.
But even in this example we can see how reacting directly to data changes in the
list is cheaper than, say, writing `foldl(0, (x, y) => x + y)`, as this approach
would lead to the entire list being recomputed were the first element to change.

> # Aside
> Just as you should get a bad feeling in your stomach when you see a lot of static
> `.get()`s and imperative code in a Janus application, you should be suspicious
> any time you see `.on` (or even `.react`) used directly. Unless you are sure
> those handlers should run forever, it is better to use `.listenTo` and `.reactTo`,
> as we will cover in the [resource management](/theory/resource-management)
> chapter, and as done in the [actual implementation of sum](https://github.com/clint-tseng/janus/blob/master/src/collection/derived/sum-fold.coffee).

~~~ noexec
// TODO: do we want to include a crazier example?
~~~

A Broader Perspective: Enumerable, Traversal
============================================

As we close up on Lists and prepare to look forward to Maps and Models, it will
be useful to look at what Lists and Maps share in common, and how structures
intermingling the two may be efficiently dealt with.

Both List and Map derive from `Enumerable`. Enumerable demands that its subclasses
offer basic key/value storage (by numeric index in the case of List and by string
key in the case of Map), ways to watch those keys, and a way to get a List of
the data structure's keys that is updated as the structure itself changes (this
is the actual `Enumeration` itself).

Getting a list of the keys in a List may not sound too exciting, but the unity
this interface provides allows manipulation code to handle both List-like and
Map-like structures with little to no discrimination between the two.

One of the most powerful applications of this property is Traversal, which provides
a purely functional, descriptive interface for traversing any arbitrary structure
of Lists and Maps. We won't do much explanation here; more information on Traversals
may be found in its own [Further Reading chapter](/further-reading/traversal), but
here are some simple examples to give you a sense for them:

~~~
const { recurse, varying, value } = types.traversal;
const includesDeep = (data, target) => {
  target = Varying.of(target);
  return Traversal.asList(data, {
    map: (k, v) => ((v != null) && (v.isEnumerable === true))
      ? recurse(v)
      : varying(target.map(tgt => value(tgt === v))),

    reduce: (list => list.any())
  });
};

const data = new Map({
  a: 4,
  b: new List([ 8, 15 ]),
  c: new Map({ d: 16, e: new List([ 23, new List([ 42 ]) ]) })
});
const target = 42;
return includesDeep(data, target); // TODO: use inspect.panel here?
~~~

Here we build a tool that allows us to search for any arbitrary value (which itself
may change if it's a Varying) at any depth in a structure. Our test data is a
complete mess of Maps and Lists, but because we can just treat the entire problem
as a per-key/value-pair decision on what to do, we never have to worry about that
detail.

Here's another example, perhaps more directly practical&mdash;it can sometimes
arise that some data structure wants to be serialized one way in some scenarios,
but another way in others. This can be accomplished by providing additional methods,
or parameterizing the methods that are there, but even this can get prohibitively
complex when that parameterization must occur some levels deep in a nested structure.

In Janus, we invert control over the problem, allowing external influence over the
serialization process (which itself is already built on Traversal).

~~~
const City = Model.build();
const Neighborhood = Model.build();
const Business = Model.build();
const Person = Model.build();

const { delegate, value } = types.traversal;
const serialize = (data, personIdsOnly) => Traversal.getNatural(data, {
  map: (k, v) => ((v instanceof Person) && (personIdsOnly === true))
    ? value(v.get('id'))
    : delegate(Traversal.default.serialize.map)
});

// some example data:
const alice = new Person({ name: 'Alice', id: 1 });
const bob = new Person({ name: 'Bob', id: 2 });
const chelsea = new Person({ name: 'Chelsea', id: 3 });
const david = new Person({ name: 'David', id: 4 });

const data = new City({
  name: 'Seattle',
  neighborhoods: new List([
    new Neighborhood({
      name: 'Capitol Hill',
      businesses: new List([
        new Business({ name: 'Superb Coffee', owner: alice }),
        new Business({ name: 'Best Pizza', owner: bob })
      ]),
      residents: new List([ alice, bob, chelsea ])
    }),
    new Neighborhood({
      name: 'Fremont',
      businesses: new List([
        new Business({ name: 'Amazing Beer', owner: chelsea }),
        new Business({ name: 'Superlative Ice Cream', owner: david })
      ]),
      residents: new List([ david ])
    })
  ])
});

return [
  serialize(data),
  serialize(data, true)
].map(inspect);
~~~

In this example, we have two different serialization processes. By default, we
just use Janus's built-in process, which outputs all its data to plain Javascript
structures in a very directly translation. And perhaps this is useful in some
spots in our application.

But in other cases, some API doesn't want to know about the full Person data, it
only wants the integer `id` value. So we build a new serializer that delegates
almost all of the work to the default serializer, but when it spots a Person 
(notably, whether that Person is part of a List or a Map), it steps in and just
grabs the `id` off of them instead.

There is a lot more to Traversal than what you see here, and there is quite a
bit to explain even just about what we have already shown. But all of that gets
its [own chapter](/further-reading/traversal). What we wish to emphasize here as
we move onwards to Maps and Models is that Traversal exists, it's quite powerful,
and the key to enabling Traversal is the common Enumerable interface shared by
Lists and Maps.

Recap
=====

Lists are the more straightforward data structure between Lists and Maps. They
operate almost exactly as you would expect an Array to, and they offer a lot of
the same functionality, just with some Janus philosophy incorporated.

* Lists may be created with initial values (`new List([ … ])`), and items may
  be manipulated and fetched with `.add`, `.put`, `.remove`, and `.at`.
  * In the case of `.put` and `.remove`, adding `At` (`.putAt`, `.removeAt`)
    switches to an index-based rather than reference-based interface.
  * `.length` works directly, and ES6 users can directly iterate on the List
    with `for..of`.
* Common map-like and fold-like list transformations are available: `.map`,
  `.flatten`, `.concat`, and many more.
  * These transformations respond to changes on their sources, such that the
    transformation is always correct.
  * Methods that take parameters, like `.take` or `.indexOf`, typically accept
    Varying-type parameters.
  * Pure `.foldl` can be a performance danger if used on frequently-updated
    or large Lists. We are still working out a solution for this issue.
* Internally, Lists are always backed by a `.list` property that contain a plain
  Javascript array, and communicate changes with standard events.
  * By listening to `added`, `moved`, and `removed`, you can implement efficient
    transformations of your own.
  * But you should probably get through the [Resource Management](/theory/resource-management)
    chapter before you do this.
* Lists and Maps are both Enumerable, which guarantees some basic get/set methods,
  but more importantly guarantees the ability to enumerate their keys as a List.
  * For Lists, this enumeration is just the numeric array indices it has.
  * But by unifying Lists and Maps in this way, we gain access to powerful
    transformations like Traversal.

Up Next
=======

In some sense, Maps should feel about as familiar as Lists do&mdash;they are
fairly conventional key/value stores. But just as with List, they have been
enhanced for Janus, and they form the basis behind Models.

We'll also, now that we've built up a reasonable foundation, start to look at
problem-solving approaches and structures in Janus.

When you're ready, just [click here](/theory/maps-and-models).

