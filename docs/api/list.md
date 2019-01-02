# List

Along with [`Map`](Map), `List` is one of the core data structures in Janus.
It is covered in depth in its [own article](/theory/lists).

`List` conforms to `Enumerable`, which unifies some methods between `Map` and
`List`. Those methods are notated below. TODO: this is a lie right now.

## Creation

### @constructor
#### new List(): List

Invoking the constructor without arguments creates a new empty `List`.

#### new List(x: T): List[T]

Giving a value `x` to the constructor will create a new `List` containing just
that value.

~~~
return new List(42);
~~~

#### new List(Array[\*]): List[\*]

Supplying an `Array` to the constructor with create a new `List` with the same
contents as the `Array`.

~~~
return new List([ 42, 'hello' ]);
~~~

### @deserialize
#### List.deserialize(xs: Array): List

Creates a new `List` with the same content as the given `Array` `xs`.

If the `List` has a class property `List.modelClass` defined, and the associated
value is a class constructor with a `@deserialize` method defined, then that method
will be called on each (and every) value in `xs` before the value is added to the
`List`. By default, `List.modelClass` is _not_ defined.

> # See also
> The class method [`List@of`](#@of) is a helpful shortcut for setting `List.modelClass`.

~~~
class Cat extends Model {}
const Cats = List.of(Cat);

return [
  List.deserialize([ 2, 4, 8 ]),
  Cats.deserialize([ { name: 'Alice' }, { name: 'Gertrude' } ])
];
~~~

## Value Manipulation

### #add
#### .add(x: \*): void
#### .add(xs: Array[\*]): void

* !IMPURE

Given a single value `x` or an `Array` of values `xs`, the value or values will
be added to the end of the `List`.

An `added` event will be emitted on the `List` for each added element with arguments
`element`, `index`.

~~~
const list = new List([ 4, 8, 15 ]);
list.add(16);
list.add([ 23, 42 ]);
return list;
~~~

#### .add(x: \*, index: Int): void
#### .add(xs: Array[\*], index: Int): void

* !IMPURE

Given a single value `x` or an `Array` of values `xs`, the value or values will
be added at `List` position `index`. Any displaced elements will be moved after
the additions. Negative `index` values are allowed, and will count from the end
of the `List`, where `-1` points at the very last element of the `List`.

An `added` event will be emitted on the `List` for each added element with arguments
`element`, `index`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
list.add('red', -1);
list.add([ 'blue', 'green', 'yellow' ], 2);
return list;
~~~

### #set
#### .set(index: Int, value: \*): void

Sets the given `index` to `value`. If data already exists in that place, `#set`
will clobber it in-place. Negative `index` values are allowed, and will count from
the end of the `List`, where `-1` points at the very last element of the `List`.

If an existing data element is overwritten with this operation, then a `removed`
event will be emitted on the `List` for the removed element with arguments `element`,
`oldIndex`.

An `added` event will be emitted on the `List` for the added element with arguments
`element`, `index`.

> It is somewhat awkward that this parameter order is flipped relative to `#add`,
> but in that case the index is an optional parameter and in this case we are
> conforming to `Enumerable#set` as part of standardization between `List` and
> `Map`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
list.set(-1, 'red');
list.set(2, 'green');
return list;
~~~

### #remove
#### .remove(x: T): T?

* !IMPURE

Given a value `x`, will find the first value in the list that `=== x` and remove
it. Subsequent `List` values will be moved up to fill the gap. The removed value
is returned, if any.

A `removed` event will be emitted on the `List` for the removed element with arguments
`element`, `oldIndex`.

~~~
const object = { x: 3, y: 4 };
const list = new List([ 1, 2, object, 5 ]);
return [
  list.remove(1),
  list.remove(object),
  list
];
~~~

### #removeAt
#### .removeAt(index: Int): T?

* !IMPURE

Given an `index` in the `List`, removes the value at the `index` and returns it
if it exists. Negative `index` values are allowed, and will count from the end
of the `List`, where `-1` points at the very last element of the `List`.

A `removed` event will be emitted on the `List` for the removed element with
arguments `element`, `oldIndex`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
return [
  list.removeAt(0),
  list.removeAt(-2),
  list
];
~~~

### #removeAll
#### .removeAll(): Array

* !IMPURE

Removes all elements from the `List` and returns them as an `Array`.

A `removed` event will be emitted on the `List` for each removed element with
arguments `element`, `oldIndex`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
return [
  list.removeAll(),
  list
];
~~~

### #move
#### .move(x: T, index: Int): T?

* !IMPURE

Given a value `x`, will find the first value in the list that `=== x` and move
it to the `index`. The moved value will be returned if it was found.

The result of the operation is that `x` will be at `index` within the list.
First it is removed from its current position, at which point elements later in
the list shift up to fill the hole, and then it is inserted back into the `List`
at `index`, at which point all elements later in the list shift back to accommodate.

A `moved` event will be emitted on the `List` if the element is found and moved,
with arguments `element`, `newIndex`, `oldIndex`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
list.move(2, -1);
list.move(4, 0);
return list;
~~~

### #moveAt
#### .moveAt(from: Int, to: Int): T

* !IMPURE

Like `#move`, but the first parameter `from` points at an index location on the
list rather than taking a value and searching the list for it. Unlike `#move`,
`#moveAt` will _always_ carry out a move operation; if the index is out of bounds,
the value `undefined` will be inserted in the new location.

For further details otherwise, please see the notes on `#move`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
list.moveAt(2, 0);
list.moveAt(99, -2);
return list;
~~~

## Value Retrieval and Observation

### #at
#### .at(index: Int): \*?
#### .get(index: Int): \*?

TODO alias

You can access list members by index using either `.at` or `.get`; they are identical.
If an element exists at the given `index`, it will be returned. Negative `index`
values are allowed, and will count from the end of the `List`, where `-1` points
at the very last element of the `List`.

~~~
const list = new List([ 2, 4, 8 ]);
return [
  list.at(0),
  list.get(-1),
  list.at(99)
];
~~~

### #watchAt
#### .watchAt(index: Int): Varying[\*?]
#### .watch(index: Int): Varying[\*?]

Given an integer `index`, both `#watch` and `#watchAt` (they are identical) will
return a `Varying` whose value will always reflect the contents of the List at
that index. Negative `index` values are allowed, and will count from the end of
the `List`, where `-1` points at the very last element of the `List`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const first = list.watchAt(0);
const last = list.watch(-1);

list.remove(0);
list.add([ 6, 7, 8 ]);
return [ first, last ];
~~~

### .length
#### .length: Int

TODO: missing from nav list

Gives the length of the list.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
return list.length;
~~~

### #watchLength
#### .watchLength(): Varying[Int]

Returns a `Varying` whose value always reflects the length of this `List`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const result = list.watchLength();
list.add([ 6, 7, 8 ]);
return result;
~~~

### #empty
#### .empty(): Boolean

Returns `true` if this `List` is empty, `false` otherwise.

~~~
return [
  new List([ 0 ]).empty(),
  new List().empty()
];
~~~

### #watchEmpty
#### .watchEmpty(): Boolean

Returns a `Varying` whose value is `true` if this `List` is empty, `false` otherwise.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const result = list.watchEmpty();
list.removeAll();
return result;
~~~

### #nonEmpty
#### .nonEmpty(): Boolean

Returns `false` if this `List` is empty, `true` otherwise.

~~~
return [
  new List([ 0 ]).nonEmpty(),
  new List().nonEmpty()
];
~~~

### #watchNonEmpty
#### .watchNonEmpty(): Boolean

Returns a `Varying` whose value is `false` if this `List` is empty, `true` otherwise.

~~~
const list = new List();
const result = list.watchNonEmpty();
list.add(16);
return result;
~~~

## Mapping and Transformation

### #map
#### .map(f: T -> U): List[U]

Given a mapping function `f`, returns a new `List` whose contents are mapped by
`f`. The mapped list will be eagerly kept up to date until it is `.destroy()`ed.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const mapped = list.map(x => x * 2);

list.add(6);
list.set(2, 'hi');

return mapped;
~~~

### #flatMap
#### .flatMap(f: T -> U|Varying[U]): List[U]

Like `#map`, except that should `f` return a `Varying`, that `Varying` will be
flattened such that its contents are always the mapping result stored in the `List`.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const factor = new Varying(4);
const mapped = list.flatMap(x => factor.map(k => k * x));

list.add(6);
list.set(2, 'hi');
factor.set(1.5);

return mapped;
~~~

### #mapPairs
#### .mapPairs(f: (index: Int, value: T -> U)): List[U]

Like [`#map`](#map), but provides the mapping function `f` with arguments `(index, value)`
rather than just the `value`. The mapped list will be eagerly updated until it
is `destroy()`ed.

~~~
const list = new List([ 2, 3, 4, 7, 11 ]);
const mapped = list.mapPairs((idx, num) => `Prime number ${idx + 1} is ${num}`);

list.add(13);

return mapped;
~~~

### #flatMapPairs
#### .flatMapPairs(f: (index: Int, value: T -> U|Varying[U])): List[U]

Like [`#flatMap`], but provides the mapping function `f` with arguments `(index, value)`
rather than just the `value`. The flatmapped list will be eagerly updated until
it is `destroy()`ed.

~~~
const list = new List([ 2, 3, 4, 7, 11 ]);
const prefix = new Varying('Prime');
const mapped = list.flatMapPairs((idx, num) =>
  prefix.map((str) => `${str} number ${idx + 1} is ${num}`));

prefix.set('Cool');
list.add(13);

return mapped;
~~~

### #filter
#### .filter(f: T -> Boolean|Varying[Boolean]): List[T]

Given a filter function `f` which indicates whether the given list element should
be preserved, returns a new `List` which will always contain the elements of the
original for which `f` returns `true`. The resulting filtered list will continue
to be eagerly updated in response to the original until it is `.destroy()`ed.

`f` may return a `Varying[Boolean]`, in which case the `Varying` is flattened such
that its contents always indicate whether the element should be included.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const threshold = new Varying(1);
const filtered = list.filter(x => threshold.map(k => k <= x));

list.add(6);
threshold.set(3);

return filtered;
~~~

### #take
#### .take(n: Int|Varying[Int]): List[T]

Given an integer `n` or a `Varying` containing an integer `n`, returns a new List
which will always contain at most the first `n` elements of the original list.
Should `n` be larger than the list length, the entire list will be returned, and
it will be the same length as the original list.

Should the original list `l` change, the taken result list will be eagerly updated
until it is `.destroy()`ed.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const take = new Varying(3);
const result = list.take(take);

list.add(-1, 0);
take.set(4);

return result;
~~~

### #flatten
#### l: List[\*|List[\*]] => l.flatten(): List[\*]

Returns a new `List`. For each _direct_ member of the original `l` which is a `List`,
that list will be flattened and all its contents inserted in its place.

Should the original list `l` or its sublists change, the flattened result list
will be eagerly updated until it is `.destroy()`ed.

~~~
const list = new List([ 0, new List([ 1, 2 ]), 3, new List([ 4, 5 ]) ]);
const flattened = list.flatten();

list.add(new List([ 6, 7, new List([ 8 ]) ]));
list.get(1).add(2.5);

return flattened;
~~~

### #concat
#### .concat(…ls: List[\*]): List[\*]

Given arguments of as many `List` instances as desired, returns a new `List` which
concatenates the base `List` and all provided `List`s together in order.

Should the base `List` or any of the argument-given `List`s change, the concatenated
result list will be eagerly updated until it is `.destroy()`ed.

~~~
const list1 = new List([ 0, 1, 2 ]);
const list2 = new List([ 4, 5, 6 ]);
const list3 = new List([ 10, 11, 12 ]);

const result = list1.concat(list2, list3);
list1.add(3);

return result;
~~~

### #uniq
#### .uniq(): List[\*]

Returns a new `List` which contains only one instance of each unique value in the
original, as determined by `===` equality. We do not guarantee any particular
ordering on the resulting list.

Until `.destroy()` is called on the resulting list, it will be eagerly kept up
to date as the original changes.

~~~
const list = new List([ 0, 1, 1, 2, 3, 4, 4, 4, 5, 0 ]);
const uniques = list.uniq();

list.add(6);
list.add(6);
list.remove(1);

return list;
~~~

### #serialize
#### .serialize(): [\*]

Returns a plain Javascript object representation of this `List`'s data. The resulting
object instance is fresh, and may be modified without concern. It will _not_ be
updated as the source data changes.

~~~
const list = new List([ 0, 1, 2, new List([ 3, 4 ]), new Map({ last: 6 }) ]);
return list.serialize();
~~~

## Fold-like Operations

### #includes
#### .includes(T|Varying[T]): Varying[Boolean]

Given a single value, or a `Varying` that contains a value, returns a `Varying[Boolean]`
indicating whether that value exists in the list, as determined by `===` equality.

The resulting `Varying` is managed, so calling `#includes` does not by itself cause
any work to be done. Only when `#get` or `#react` are called on the `Varying` result
is work performed, and only for as long as required by those methods.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const result = list.includes(3);

list.remove(3);

return result;
~~~

### #indexOf
#### .indexOf(T|Varying[T]): Varying[Int]

Given a single value, or a `Varying` that contains a value, returns a `Varying[Int]`
indicating the integer index of the first instance of the value in the list, as
determined by `===` equality.

As with native JS Array `.indexOf`, the value `-1` is returned if the value cannot
be found.

The resulting `Varying` is managed, so calling `#indexOf` does not by itself cause
any work to be done. Only when `#get` or `#react` are called on the `Varying` result
is work performed, and only for as long as required by those methods.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0 ]);
const result = list.indexOf(3);

list.remove(3);

return result;
~~~

### #any
#### .any(f: T -> Boolean|Varying[Boolean]): Varying[Boolean]

Given a function `f` which takes a list element and returns either a `Boolean`
or a `Varying[Boolean]`. If any value in the list results in a `true` result from
`f`, the result of `#any` is true.

This is accomplished under the covers by calling `.flatMap(…).includes(true)`,
but the resulting `Varying` is managed, so calling `#any` does not directly cause
any work to be done; only while the `Varying` is observed in some way does work
happen.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const threshold = new Varying(7);
const result = list.any(x => threshold.map(k => x > k));

list.remove(5);
threshold.set(4);

return result;
~~~

#### .any(): Varying[Boolean]

Exactly equivalent to calling `.includes(true)` on the `List`.

### #min
#### l: List[Number] => l.min(): Varying[Number]

Returns a `Varying` which always contains the smallest of all elements in this
`List`, as determined by the `<` operator.

The resulting `Varying` is managed, so calling `#min` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const min = list.min();
list.remove(0);
return min;
~~~

### #max
#### l: List[Number] => l.max(): Varying[Number]

Returns a `Varying` which always contains the largest of all elements in this `List`,
as determined by the `>` operator.

The resulting `Varying` is managed, so calling `#max` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const max = list.max();
list.add(9);
return max;
~~~

### #sum
#### l: List[Number] => l.sum(): Varying[Number]

Returns a `Varying` which always contains the sum of all elements in this `List`.
This process works by summing and subtracting indiscriminately, so it will not
work well if the elements are not all numeric.

The resulting `Varying` is managed, so calling `#sum` does not by itself cause
any work to be done. Only while the `Varying` result is observed is work performed,
and only for as long as required.

~~~
const list = new List([ 0, 1, 2, 3, 4, 5 ]);
const sum = list.sum();
list.remove(3);
list.add(9);
return sum;
~~~

## Enumeration

### #enumerate
#### .enumerate(): Array[Int]

Returns a static array of the numeric indices in the `List`. Regardless of the
presence of `null` elements or a sparse array, this method will always return all
integer values from `0` to the index of the final element in the list.

~~~
const list = new List([ 0, 1, 2 ]);
list.set(5, 'hello!');
return list.enumerate();
~~~

### #enumeration
#### .enumeration(): List[Int]

Like `#enumerate`, but instead of a static `Array` returns a `List` will remain
up-to-date as the `List` members change. Again, all integer values from `0` to
the index of the final element in the list are always included.

~~~
const list = new List([ 0, 1, 2 ]);
const enumeration = list.enumeration();
list.set(5, 'hello!');
return enumeration;
~~~

### .length
#### .length: Int

Returns the number of elements present in this `List` at the time of calling.

~~~
const list = new List([ 0, 1, 2 ]);
list.set(5, 'hello!');
return list.length;
~~~

### #watchLength
#### .watchLength(): Varying[Int]

Returns the number of elements present in this `List`, in the form of a `Varying[Int]`.
This is exactly equivalent to calling `.enumeration().watchLength()`.

~~~ inspect-entity
const list = new List([ 0, 1, 2 ]);
const length = list.watchLength();
list.set(5, 'hello!');
return length;
~~~

## Change Detection

### #watchDiff
#### .watchDiff(other: List): Varying[Boolean]

Compares two structures, and returns a `Varying[Boolean]` indicating whether the
structures are different (`true`) or not (`false`). The following rules are used
to make this determination:

* If the structures are not of the same type (eg `Map` vs `List`, or worse), they
  are different.
* If the structures are of the same type but have different indices, they are different.
* Values are then compared: any value that is `Enumerable` (`Map` or `List`) will
  be recursed into, and these rules reconsidered from the top. This happens even
  if the two structures are different instances: this mechanism cares only about
  structure and values.
* Any other values are compared with `===` strict equality.

~~~ inspect-entity
const listA = new List([
  2,
  new List([ 4, 6, 8 ]),
  new Map({ name: 'submap', sublist: new List([ 10 ]) })
]);
const listB = new List([
  2,
  new List([ 4, 6, 8 ]),
  new Map({ name: 'submap', sublist: new List([ 10 ]) })
]);
return listA.watchDiff(listB);
~~~

