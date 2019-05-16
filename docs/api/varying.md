# Varying

A `Varying` contains a single value and offers ways to get and fetch that value,
observe it over time, or produce observable transformations of it.

* !VARIANT DerivedVarying: Mapped, Composed, or Managed Varyings
* !VARIANT UnreducedVarying: Result of `@all`, carries multiple values

## Definition and Instantiation

### @constructor
#### new Varying(x: T): Varying[T]

Invoking the `Varying` constructor will _always_ return a Varying containing the
given value `x`, regardless of what `x` is.

~~~
return new Varying(42);
~~~

### @box
#### Varying.box(x: T): Varying[T]

An alternative invocation to the [@constructor](#@constructor), `Varying.box` also
always returns a Varying containing `x`.

~~~
return [
  Varying.box(42),
  Varying.box(new Varying(42))
];
~~~

### @of
#### Varying.of(x: T|Varying[T]): Varying[T]

Unlike the [@constructor](#@constructor) and [@box](#@box), `Varying.of` will return
`x` without modification if it is already a `Varying` instance. Otherwise, it will
return a new Varying containing `x`.

~~~
return [
  Varying.of(42),
  Varying.of(new Varying(42))
];
~~~

## Data Manipulation

### #get
#### v: Varying[T] => v.get(): T

Gets the value within this Varying. In the case of a `DerivedVarying`, this operation
may require the value to be computed (specifically if the Varying has no observers),
in which case it is done on demand each time.

~~~
const v = new Varying(42);
return v.get();
~~~

### #set
#### .set(x: T): void

* !VARIANT DerivedVarying !UNAVAILABLE
* !IMPURE

Sets a value into this Varying.

If there are observers on this `Varying`, or observed `DerivedVarying`s based upon
it, they will be updated accordingly.

`DerivedVarying`s do not offer this method, as their values are based entirely
on their source.

~~~
const v = new Varying(42);
v.set(23);
return v.get();
~~~

## Value Observation

### #react
#### v: Varying[T] => v.react(callback: (T -> void)): Observation

* !VARIANT UnreducedVarying v.react(callback: (…* -> void)): Observation
* !IMPURE

Once `.react` is called, `callback` will be called every time the Varying value
changes.

Note that "change" refers to the breakage of `===` strict equality: if the contained
value is swapped by any means but the new value is strictly equal to the old one,
`.react` will _not_ be called.

Within `callback`, `this` is bound to the `Observation` that is returned from this
call, so that `this.stop()` will stop the reaction. Remember, however, that ES6
lambda functions `(…) => …` do not bind `this`, only traditional `function() {}`s.

~~~
const v = new Varying(4), results = [];
const observation = v.react(x => { results.push(x); });
v.set(8);
observation.stop();
v.set(15);
return results;
~~~

#### v: Varying[T] => v.react(immediate: Bool, callback: (T -> void)): Observation

* !VARIANT UnreducedVarying v.react(immediate: Bool, callback: (…* -> void)): Observation
* !IMPURE

Like `.react`, but `immediate` gates whether `callback` will be called _immediately_
(`immediate = true`), or whether it should not be called until the _next_ time the
value changes (`immediate = false`). If omitted entirely, `immediate` defaults
to `true`.

~~~
const v = new Varying(8), results = [];
v.react(false, x => { results.push(x); });
v.set(15);
return results;
~~~

## Mapping and Transformation

### #map
#### v: Varying[T] => v.map(f: (T -> U)): Varying[U]

* !VARIANT UnreducedVarying v.map(f: (…* -> U)): Varying[U]

Returns a new `Varying` that always contains the value of the original `Varying`
transformed by mapping function `f`. If `f` returns a `Varying`, the mapped
`Varying` will be of type `Varying[Varying[*]]`.

`f` _must_ be a pure function. Relying on it to perform side-effects is dangerous,
as it will not be called unless an observer exists to force its value.

~~~
const v = new Varying(2), results = [];
const mapped = v.map(x => x + 1);
mapped.react(x => { results.push(x); });
v.set(4);
return results;
~~~

### #flatMap
#### v: Varying[T] => v.flatMap(f: (T -> U|Varying[U])): Varying[U]

* !VARIANT UnreducedVarying v.map(f: (…* -> U|Varying[U])): Varying[U]

Like `.map`, but when `f` returns a `Varying[U]`, the mapped `Varying` will adopt
the inner `Varying` value as its own&mdash;in this case, such that it carries type
`U`.

As with [`#map`](#map), `f` _must_ be a pure function.

~~~
const v1 = new Varying(2), v2 = new Varying(3), results = [];
const fmapped = v1.flatMap(x => v2.map(y => x * y));
fmapped.react(x => { results.push(x); });
v1.set(4);
v2.set(5);
return results;
~~~

### #flatten
#### v: Varying[Varying[T]] => v.flatten(): Varying[T]

* !VARIANT UnreducedVarying !UNAVAILABLE

Returns a new `Varying`, but if the original `Varying` contained a nested `Varying`,
this new `Varying` will flatten it, adopting the value of that nested `Varying`
as its own. This is akin to calling `.flatMap` but with `identity` (`x => x`) as
the mapping function `f`.

~~~
return Varying.box(Varying.box(Varying.box(42))).flatten();
~~~

### #pipe
#### v: Varying[T] => v.pipe(f: (Varying[T] -> Varying[U])): Varying[U]

Given a function `f` that takes an entire `Varying[T]` and gives a `Varying[U]`
in response, `.pipe` will apply that transformation.

The implementation is as follows: `pipe(f) { return f(this); }` and this method
exists mostly to provide a cleaner call order when using `Varying` transformers
such as those provided in the [Standard Library](TODO): `throttle`, `delay`, and
so on.

~~~
const { filter } = stdlib.varying;
const v = new Varying(2), results = [];
v.pipe(filter(x => x < 10)).react(x => { results.push(x); });
v.set(13);
v.set(8);
return results;
~~~

## Multivalue Processing

### @mapAll
#### Varying.mapAll(…vs: …Varying[\*], f: (…xs: …\* -> U)): Varying[U]
#### Varying.mapAll(f: (…xs: …\* -> U), …vs: …Varying[\*]): Varying[U]

* !CURRIES

Takes one or more `Varying`s `vs`, and a function which receives the same number
of plain value arguments `xs`, and returns a new `Varying` that always carries
the value of all the input `Varying` values mapped by the mapping function.

`f` must be pure, but it may come either at the very beginning or the very end
of the argument list. If it comes at the beginning, it may not be variadic as its
`.length` is consulted to determine how many `Varying` arguments should be expected
for currying.

~~~
const va = new Varying(3), vb = new Varying(5), vc = new Varying(7), results = [];
const mapped = Varying.mapAll(va, vb, vc, ((a, b, c) => a + b + c));
mapped.react(x => { results.push(x); });
vb.set(1);
vc.set(9);
return results;
~~~

### @flatMapAll
#### Varying.flatMapAll(…Varying[\*], f: (…\* -> U|Varying[U])): Varying[U]
#### Varying.flatMapAll(f: (…\* -> U|Varying[U]), …Varying[\*]): Varying[U]

* !CURRIES

Like `@mapAll`, but should `f` return a `Varying`, that result will be flattened
as with [`#flatMap`](#flatMap).

### @lift
#### Varying.lift(f: (…xs: …\* -> y: U|Varying[U])): (…xs: …Varying[\*] -> y: Varying[U])

Takes a function that takes any number of plain values `xs` and returns `y`,
which can be a value or a `Varying`, and returns a function that takes the same
number and order of `Varying`-wrapped values and returns a `Varying`-wrapped
mapping result.

The result is always flattened if a `Varying` is returned by `f`, and there does
not currently exist a version of `@lift` that does not flatten in this way.

~~~
const results = [];
const vf = Varying.lift((a, b, c) => a + b + c);
const va = new Varying(3), vb = new Varying(5), vc = new Varying(7);
vf(va, vb, vc).react(x => { results.push(x); });
vb.set(1);
vc.set(9);
return results;
~~~

### @all
#### Varying.all(Array[Varying[\*]]): UnreducedVarying[\*, …]

Takes an array of `Varying` objects, and returns an `UnreducedVarying`. An
`UnreducedVarying` differs from a typical `DerivedVarying` in that it contains
multiple values.

This means that callback functions given to `#react` will be fed multiple arguments,
one for each `Varying` given to `@all`, and likewise for mapping functions given
to `#map` or `#flatMap`. The mapping functions may only return a single value,
still.

> `#flatten` is not available on `UnreducedVarying`s, so you may not call
> `Varying.all(…).flatten()`.

~~~
const va = new Varying(3), vb = new Varying(5), vc = new Varying(7), results = [];
Varying.all([ va, vb, vc ]).react((a, b, c) => { results.push([ a, b, c ]) });
vb.set(1);
vc.set(9);
return results;
~~~

## Resource Management

### @managed
#### Varying.managed(…resources: …(() -> Base), computation: (…Base -> Varying[T])): Varying[T]

Takes any number of resource-instantiating functions `resources`, and a function
`computation` which receives those instantiated resources and formulates a `Varying`
out of them.

Uses observer count to automatically create the resources only when they are needed
and `#destroy` them when they are not. Please see [the Resource Management](/theory/resource-management#managing-varyings)
theory chapter for more information.

~~~
const expensiveComputation = Varying.managed(
  () => new Map({ a: 4, b: 5, c: 6 }),
  () => new List([ 1, 2, 3 ]),
  (map, list) => map.enumerate().concat(list).length
);
const results = [];
// causes the map and list to be instantiated:
const o1 = expensiveComputation.react(x => { results.push([ 'o1', x ]); });
const o2 = expensiveComputation.react(x => { results.push([ 'o2', x ]); });
o1.stop();
o2.stop(); // causes the map and list to be destroyed.
return results;
~~~

### #refCount
#### .refCount(): Varying[Int]

Returns a `Varying` that always contains the number of observers on the original
`Varying`. This can be useful for kicking off expensive computations only when
they are actually required.

The `.refCount` count is updated _before_ the new reaction is executed, so you
have a moment to sneak a value into the Varying just before the first reaction
callback occurs.

~~~
const results = [];
const v = new Varying(0);
v.refCount().react(count => { if (count > 0) v.set(42); });

v.react(x => { results.push(x); });
return results;
~~~

