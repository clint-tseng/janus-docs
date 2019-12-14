# Map

* !SAMPLES inspect-panel

Along with [`List`](List), `Map` is one of the core data structures in Janus.
It is covered in depth in its [own article](/theory/maps-and-models).

`Map` conforms to `Enumerable`, which unifies some methods between `Map` and
`List`. Those methods are notated below.

## Creation

### @constructor
#### new Map(): Map

Creates and returns a new empty `Map`.

~~~ inspect-entity
return new Map();
~~~

#### new Map({ String: * }): Map

Creates a new `Map`, populates it with the given data, and returns it. Equivalent
to creating a new map and calling `.set({ … })`.

~~~
return new Map({ a: 1, b: 2, c: 3 });
~~~

### @deserialize
#### Map.deserialize({ String: * }): Map

Equivalent to calling the constructor with the provided data. Unlike `Model`,
`Map` does not do anything special with the data other than populate it.

~~~
return Map.deserialize({ a: 1, b: 2, c: 3 });
~~~

## Value Manipulation

### #set

Ultimately, all of these methods set some value or values into the `Map`, but
many forms are offered for various purposes.

#### .set(key: String, value: \*): void

* !IMPURE

The simplest and probably most commonly used form, `.set(key, value)` simply sets
the given `value` at the given `key`, accounting for dot notation nesting.

Given an `Object` `value`, each leaf value in the object will be individually
set in-place into the `Map`. The object and subobjects are not themselves set.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
map.set('new.value', 42);
map.set('nested', { subobject: true });
return map;
~~~

#### .set({ String : \* }): void

* !IMPURE

Sets all values in the given structure in the same places in the `Map`. This is
just like calling `.set(key, value)` with an `Object` `value`, except that the
object structure is figured from the `Map` root rather than from the given `key`.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
map.set({ nested: { additional: true }, new: { object: true } });
return map;
~~~

#### .set(key: String): (value: \* -> void)

* !IMPURE

A currying form of `.set(key, value)`, calling `.set(key)` with no `value` returns
a function which, when called with a `value`, sets that value at the given `key`.

Handy for shortcuts like this:

~~~
const varying = new Varying(1);
const map = new Map();

varying.react(map.set('some.key'));
varying.set(4);
return map;
~~~

### #unset
#### .unset(key: String): void

* !IMPURE

Clears out the data at some particular `key`. It _is_ possible to call `.set(key, null)`,
but one has to take care not to use `undefined` or other falsy values, and so we
generally recommend `#unset` when possible. (And in fact, `#set` itself delegates
to `#unset` when it senses that `value === null`.)

~~~
const map = new Map({ name: 'a map', number: 7, nested: { name: 'nested object' } });
map.unset('name');
map.unset('nested');
return map;
~~~

## Value Retrieval and Observation

### #get
#### .get(key: String): Varying[\*]

Returns a `Varying` that always contains the value at the given `key`. Results
are cached, so all `Varying`s returned for a given `key` will be the same instance.

~~~ inspect-entity
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
const result = map.get('nested.name');
map.set('nested.name', 'objects in space');
return result;
~~~

### #get_
#### .get_(key: String): \*|null

Gets the value associated with the given key. If no value exists there, `null`
will be returned. Maps understand dot notation for nesting data.

~~~ inspect-entity
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return [
  map.get_('name'),
  map.get_('nested'),
  map.get_('nested.name')
];
~~~

## Shadow Copying

`Map`s may be shadow-copied, which creates layered clones which track the data
and changes on the original, and apply their own local changes on top. They are
covered in-depth [here](/theory/maps-and-models#shadow-copied-maps).

### #shadow
#### .shadow(): Map

Returns a new shadow copy of the same classtype as the original. Changes to the
original reflect on the shadow, but the shadow may be manipulated locally, and
these local changes will override the parent data.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
const shadow = map.shadow();

map.set('name', 'A MAP!!');
shadow.set('number', 9);
shadow.unset('nested');

return shadow;
~~~

#### .shadow(T: @+Map): T

Like the parameterless invocation, but uses `T` as the return type. `T` must be
a subtype of `Map`, or else the resulting behavior is not guaranteed.

### #with
#### .with({ String: \* }): Map

Returns a new shadow copy of the same classtype as the original, just like `#shadow`.
Unlike `#shadow`, `#with` takes some data to immediately overlay into the new shadow.

This is exactly equivalent to calling `.shadow()`, then calling `.set({ … })`
on the result&mdash;but this shortcut invocation turns the operation into a one-liner,
which can be useful when writing lambda expressions.

~~~
const varying = new Varying(new Map({ name: 'a map' }));
const result = varying.map(m => m.with({ number: 7 }));
return result.get();
~~~

### #revert
#### .revert(key: String): void

* !IMPURE

When called on a shadow copy, will remove any local changes overlaid at the `key`,
reverting it to the parent value. When called on a non-shadow-copy `Map`, does
nothing.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
const shadow = map.shadow();
shadow.set('nested', false);
shadow.set('number', 11);
shadow.revert('nested');
return shadow;
~~~

### #original
#### .original(): Map

When called on a shadow copy, returns the original rootmost `Map` associated with
the shadow. When called on a non-shadow-copy `Map`, returns itself.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.shadow().shadow().shadow().original() === map;
~~~

## Mapping and Transformation

### #mapPairs
#### .mapPairs(f: (key: String, value: T -> U)): Map

Returns a new object of the same classtype and key structure as the original, but
with values mapped by the mapping function `f`, which takes the `key` and `value`
as its inputs. Should the original `Map` change, the mapped result will be updated
to reflect the new data.

~~~
const original = new Map({ name: 'a map', nested: { name: 'nested object' } });
const mapped = original.mapPairs((k, v) => v.toUpperCase());
original.set('greeting', 'salutations');
return mapped;
~~~

### #flatMapPairs
#### .flatMapPairs(f: (key: String, value: T -> U|Varying[U])): Map

Like `#mapPairs`, but as with the rest of Janus the addition of `flat` indicates
that should the result of mapping function `f` be a `Varying`, then that `Varying`
will be flattened. In this case, this means that the value _within_ the `Varying`
result is what will be set into the resulting `Map`, even as that value changes.

~~~
const factor = new Varying(2);
const original = new Map({ a: 1, b: 2, c: 3 });
const mapped = original.flatMapPairs((k, v) => factor.map(k => k * v));
original.set('b', 7);
factor.set(3);
return mapped;
~~~

### #serialize
#### .serialize(): {\*}

Returns a plain Javascript object representation of this `Map`'s data. The resulting
object instance is fresh, and may be modified without concern.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.serialize();
~~~

## Enumeration

### #enumerate
#### .enumerate(): Set[String]

Returns a `Set` of the `String` keys in the `Map`. The Set will remain up-to-date
as the `Map` structure changes, until either is destroyed. Only data leaves are
represented; intermediate keys that point at nested objects are not returned.
Nested structures will result in dot-delimited key names.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
const keys = map.enumerate();
map.set('number', 13);
map.set('nested.number', 17);
return keys;
~~~

### #keys
#### .keys(): Set[String]

Alias for [`#enumerate`](#enumerate).

### #enumerate
#### .enumerate_(): Array[String]

Returns a static array of the String keys in the `Map`. Only data leaves are
represented; intermediate keys that point at nested objects are not returned.
Nested objects will result in dot-delimited keys.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.keys_();
~~~

### #keys_
#### .keys_(): Array[String]

Alias for [`#enumerate_`](#enumerate_).

### #values
#### .values(): List[\*]

Returns a `List` of all values within the `Map`. There is no particular order
guaranteed. This is exactly equivalent to calling `map.keys().flatMap(k => map.get(k))`.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.values();
~~~

### #values_
#### .values_(): List[\*]

Returns an `Array` of all values within the `Map`. There is no particular order
guaranteed. This is exactly equivalent to calling `map.keys_()` and then `.get_`ting
from the map each `key`.

~~~
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.values_();
~~~

### .length
#### .length: Varying[Int]

Returns the number of key/value pairs present in this `Map`, in the form of a
`Varying[Int]`. This is exactly equivalent to calling `.enumerate().length()`.

~~~ inspect-entity
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
const length = map.length;
map.set('number', 13);
map.set('nested.number', 17);
return length;
~~~

### .length_
#### .length_: Int

Returns the number of key/value pairs present in this `Map`, as a plain integer.
This is exactly equivalent to calling `.enumerate().length_`.

~~~ inspect-entity
const map = new Map({ name: 'a map', nested: { name: 'nested object' } });
return map.length_;
~~~


## Change Detection

### #diff
#### .diff(other: Map): Varying[Boolean]

Compares two structures, and returns a `Varying[Boolean]` indicating whether the
structures are different (`true`) or not (`false`). The following rules are used
to make this determination:

* If the structures are not of the same type (eg `Map` vs `List`, or worse), they
  are different.
* If the structures are of the same type but have different key structures, they
  are different.
* Values are then compared: any value that is `Enumerable` (`Map` or `List`) will
  be recursed into, and these rules reconsidered from the top. This happens even
  if the two structures are different instances: this mechanism cares only about
  structure and values.
* Any other values are compared with `===` strict equality.

~~~ inspect-entity
const mapA = new Map({
  name: 'a map',
  submap: new Map({ name: 'submap', subsublist: new List([ 0 ]) }),
  sublist: new List([ 2, 4, 8 ])
});
const mapB = new Map({
  name: 'a map',
  submap: new Map({ name: 'submap', subsublist: new List([ 0 ]) }),
  sublist: new List([ 2, 4, 8 ])
});
return mapA.diff(mapB);
~~~

### #modified
#### .modified(): Varying[Boolean]

Like `#diff`, but rather than being passed another object to compare against,
`#modified` compares a `Map` against its shadow parent. If the `Map` is an
original with no parent, `Varying[false]` is always returned.

For the rules of comparison, see the notes on `#diff` above.

~~~ inspect-entity
const original = new Map({
  name: 'a map',
  submap: new Map({ name: 'submap', subsublist: new List([ 0 ]) }),
  sublist: new List([ 2, 4, 8 ])
});
const shadow = original.shadow();

shadow.set('sublist', new List([ 2, 4, 8 ]));
// shadow.get_('submap').get_('subsublist').add(1);

return shadow.modified();
~~~

