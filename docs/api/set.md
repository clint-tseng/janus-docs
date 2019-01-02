# Set

Set is similar to `List`, but it is (mostly) unordered, and it only permits one
instance of each value (as determined by `===` comparison) at a time.

For practical purposes (rendering a `Set` upon a page, for instance), `Set` _does_
maintain an internal ordering of its elements. But any direct manipulation or
observation of this ordering is not possible. On the other hand, the available
mapping and transformation methods often return a `List` rather than a `Set`.

`Set` conforms to `Enumerable`, which unifies some methods between `Map` and
`List`, to which `Set` is a close relative.

## Creation

### @constructor
#### new Set(): Set

Invoking the constructor without arguments creates a new empty `Set`.

#### new Set(x: T): Set[T]

Giving a value `x` to the constructor will create a new `Set` containing just
that value.

~~~
return new Set(42);
~~~

#### new Set(Array[\*]): Set[\*]

Supplying an `Array` to the constructor with create a new `Set` with the contents
of the `Array`, deduplicated as necessary.

~~~
return new Set([ 42, 'hello', 47, 'hello' ]);
~~~

### @deserialize
#### Set.deserialize(xs: Array): Set

Creates a new `Set` with the content of the given `Array` `xs`, deduplicated as
necessary.

~~~
return Set.deserialize([ 42, 'hello', 47, 'hello' ]);
~~~

## Value Manipulation

### #add
#### .add(x: \*): void
#### .add(xs: Array[\*]): void

* !IMPURE

Given a single value `x` or an `Array` of values `xs`, the value or values will
be added to the `Set`. Any values that are already in the `Set` will be silently
ignored.

~~~
const set = new Set([ 4, 8, 15 ]);
set.add(15);
set.add(16);
set.add([ 16, 23, 42 ]);
return set;
~~~

### #remove
#### .remove(x: T): T?

* !IMPURE

Given a value `x`, will remove it from the `Set`. The removed value is returned,
if any.

~~~
const object = { x: 3, y: 4 };
const set = new Set([ 1, 2, object, 5 ]);
return [
  set.remove(1),
  set.remove(object),
  set
];
~~~

## Value Retrieval and Observation

### #includes
#### .includes(x: \*): Boolean

Given any value `x`, returns a boolean indicating whether that value is presently
a member of this `Set`.

~~~
const set = new Set([ 2, 4, { x: 8 } ]);
return [
  set.includes(2),
  set.includes(3),
  set.includes({ x: 8 })
];
~~~

### #watchIncludes
#### .watchIncludes(x: \*): Varying[Boolean]

Given any value `x`, returns a `Varying` whose boolean value will always indicate
whether that value is presently a member of this `Set`.

~~~
const set = new Set([ 2, 4, { x: 8 } ]);
const result = set.watchIncludes(6);
set.add(6);
return result;
~~~

### .length
#### .length: Int

TODO: also missing from nav list

Gives the number of elements in this `Set`.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
return set.length;
~~~

### #watchLength
#### .watchLength(): Varying[Int]

Returns a `Varying` whose integer value always represents the number of members
in this `Set`.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const result = set.watchLength();
set.add(6);
return result;
~~~

## Mapping and Transformation

Once again, please note that for a number of reasons, most of the following transformation
methods return a `List`, not a `Set`. This means that uniqueness guarantees are
not imposed on the outputs of these transformations.

### #map
#### .map(f: T -> U): List[U]

Given a mapping function `f`, returns a new `List` whose contents are the members
of this `Set` mapped by `f`. The mapped list will be eagerly kept up to date until
it is `.destroy()`ed.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const mapped = set.map(x => x % 3);

set.add(6);
set.add(6);

return mapped;
~~~

### #flatMap
#### .flatMap(f: T -> U|Varying[U]): List[U]

Like `#map`, except that should `f` return a `Varying`, that `Varying` will be
flattened such that its contents are always the mapping result stored in the `List`.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const factor = new Varying(4);
const mapped = set.flatMap(x => factor.map(k => k * x));

set.add(6);
factor.set(1.5);

return mapped;
~~~

### #filter
#### .filter(f: T -> Boolean|Varying[Boolean]): List[T]

Given a filter function `f` which indicates whether the given set element should
be preserved, returns a new `List` which will always contain the elements of the
`Set` for which `f` returns `true`. The resulting filtered list will continue
to be eagerly updated in response to the original until it is `.destroy()`ed.

`f` may return a `Varying[Boolean]`, in which case the `Varying` is flattened such
that its contents always indicate whether the element should be included.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const threshold = new Varying(1);
const filtered = set.filter(x => threshold.map(k => k <= x));

set.add(6);
threshold.set(3);

return filtered;
~~~

### #flatten
#### l: Set[\*|Set[\*]] => l.flatten(): Set[\*]

Returns a new `Set`. For each _direct_ member of the original `s` which is a `Set`,
that set will be flattened and all unique members will be incorporated into the
parent `Set`.

Should the original set `s` or its subsets change, the flattened result `Set`
will be eagerly updated until it is `.destroy()`ed.

~~~
const subset = new Set([ 1, 2 ]);
const set = new Set([ 0, subset, 3, new Set([ 4, 5 ]) ]);
const flattened = set.flatten();

set.add(new Set([ 6, 5, new Set([ 4 ]) ]));
subset.add(7);

return flattened;
~~~

### #uniq
#### .uniq(): this

Since `Set` already imposes a uniqueness guarantee, calling `#uniq` simply returns
the `Set` itself.

~~~
const set = new Set([ 0, 1, 1, 2, 3, 4, 4, 4, 5, 0 ]);
return [
  set.uniq() === set,
  set.uniq()
];
~~~

## Fold-like Operations

### #any
#### .any(f: T -> Boolean|Varying[Boolean]): Varying[Boolean]

Given a function `f` which takes a list element and returns either a `Boolean`
or a `Varying[Boolean]`. If any value in the set results in a `true` result from
`f`, the result of `#any` is true.

This is accomplished under the covers by calling `.flatMap(…).includes(true)`,
but the resulting `Varying` is managed, so calling `#any` does not directly cause
any work to be done; only while the `Varying` is observed in some way does work
happen.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const threshold = new Varying(7);
const result = set.any(x => threshold.map(k => x > k));

set.remove(5);
threshold.set(4);

return result;
~~~

### #min
#### s: Set[Number] => s.min(): Varying[Number]

Returns a `Varying` which always contains the smallest of all elements in this
`Set`, as determined by the `<` operator.

The resulting `Varying` is managed, so calling `#min` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const min = set.min();
set.remove(0);
return min;
~~~

### #max
#### s: Set[Number] => s.max(): Varying[Number]

Returns a `Varying` which always contains the largest of all elements in this `Set`,
as determined by the `>` operator.

The resulting `Varying` is managed, so calling `#max` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const max = set.max();
set.add(9);
return max;
~~~

### #sum
#### s: Set[Number] => s.sum(): Varying[Number]

Returns a `Varying` which always contains the sum of all elements in this `Set`.
This process works by summing and subtracting indiscriminately, so it will not
work well if the elements are not all numeric.

The resulting `Varying` is managed, so calling `#sum` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const set = new Set([ 0, 1, 2, 3, 4, 5 ]);
const sum = set.sum();
set.remove(3);
set.add(9);
return sum;
~~~

## Enumeration

### #enumerate
#### .enumerate(): Array[\*]

Returns a static array of the members of this `Set`. Because `Set` is unordered
and unindexed, the members are themselves the enumeration of the `Set`.

~~~
const set = new Set([ 0, 1, 2, 3 ]);
return set.enumerate();
~~~

### #enumeration
#### .enumeration(): this

Because `Set` is unordered and unindexed, the members are themselves the enumeration
of `Set`. Therefore, calling `#enumeration` just returns the `Set` itself.

