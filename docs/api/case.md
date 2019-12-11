# Case

Janus case classes allow arbitrary values to be imbued with commonly understood
meaning (`success` or `failure`, for instance). In some cases, they are also used
to configure the extensible parts of the framework.

Case class instances (eg the result of calling `types.result.success(42)`) have
methods created based on and named after the cases in their set. So building a
new set of instances `Case.build('up', 'down')` will result in methods named
`instance.upOrElse()` and `.downOrElse()`, and so on. In this reference documentation,
we represent this by templating the method name with `{x}`; here we would use
`.{x}OrElse`, for instance.

For a more in-depth exploration of case classes, see the [theory chapter](/theory/case-classes)
on them.

## Case set definition

### @build
#### Case.build(…names: …String): { String : (\* -> Case) }

The simplest way to create a set of related cases is by supplying a set of String
`names`. You'll get back an object with keys matching the given names, and values
which are functions that take arbitrary values and wraps them in case class instances
of the given type.

~~~
const { up, down } = Case.build('up', 'down');
return [
  up(24),
  down(48)
];
~~~

For more advanced usages, simple structures are allowed in the definition alongside
Strings. We will not cover them exhaustively here; please see [this section](/case-classes#case-superclasses)
of the Case Classes chapter for full details. In brief:

Arrays and Objects allow hierarchically structured case class trees, in which parent
cases can be used to match against any of their children (eg `complete` is the
parent of `success` and `failure`). Parent cases cannot, however, be used to hold,
represent, and match against values.

~~~
const food = Case.build({ fruit: [ 'apple', 'orange' ], vegetable: [ 'kale', 'lettuce' ] });
return [
  food.apple(42),
  food.apple.match(food.apple(42)),
  food.fruit.match(food.apple(42)),
  food.vegetable.match(food.apple(42))
];
~~~

## Instance Value Extraction

### #get
#### c: Case[T] => c.get(): T

Returns the value held within the case instance.

~~~
const { up, down } = Case.build('up', 'down');

return [
  up(42).get(),
  down().get()
];
~~~

### #{x}OrElse
#### c: Case[T] => c.{x}OrElse(else: U): T|U

`.get()`s the value if the case is of `{x}` type, or else returns the given value
`else`. This is one generally preferred way to extract values, as it has some notion
of type constrainedness (unlike `#get`, for instance, which indiscriminately returns
the contained value(s)).

~~~
const { up, down } = Case.build('up', 'down');

return [
  up(42).upOrElse(-14),
  up(42).downOrElse(-14)
];
~~~

### #get{X}
#### c: Case[T] => c.get{X}: T|Case[\*]

If the case is of type `{X}`, returns the inner value(s) by way of `#get`. Otherwise
returns the case instance itself as-is. This can be useful when for instance one
case type should be rendered by its inner value, while the other cases are rendered
by their opaque case class type.

~~~
const { up, down } = Case.build('up', 'down');

return [
  up(42).getUp(),
  up(42).getDown()
];
~~~

### #match
#### c: Case[T] => c.match(value: Case): Boolean

Given some case class instance `value`, returns `true` if `value` matches `c`.
This includes the scenario where `value` is a [case subclass](/theory/case-classes#case-superclasses)
of `c`.

~~~
const { up, down, low } = Case.build('up', { down: [ 'low' ] });

return [
  up.match(low(4)),
  down.match(low(8)),
  low.match(low(15))
];
~~~

#### c: Case[T] => c.match(value: Case, f: (T -> U)): U?

Like the single-parameter version above, but instead of returning a Boolean, the
given function `f` will only be called in the case of a match. `f` will be given
the inner value of the case, and the return value of `f` will be returned by `match`.

If `value` does not match, there is no return value.

~~~
const { up, down } = Case.build('up', 'down');

return [
  up.match(down(4), (x => x * 5)),
  down.match(down(15), (x => x * 5))
];
~~~

### #toString
#### .toString(): String

Mostly useful for debugging purposes, `.toString()` will return a String naming
the case class type and the contained value content(s).

~~~
const { up, down } = Case.build('up', 'down');
return up(42).toString();
~~~

## Mapping and Transformation

### #map
#### c: Case[T] => c.map(T -> U): Case[U]

No matter the type of the case, applies the value(s) to the mapping function and
returns a new case class instance of the same type containing the new mapped value.

~~~
const { single } = Case.build('single');
return single(42).map(x => x * 2);
~~~

### #map{X}
#### c: Case[T] => c.map{X}(T -> U): Case[U]
#### c: Case[…\*] => c.map{X}(…\* -> U): Case[U]

Like [#map](#map), but will only apply the mapping function if it is of type
`{X}`. Otherwise, the original case class instance is returned as-is. This can
be useful if some operation is only required for some particular case:

~~~
const { success, failure } = types.result;
class Foo extends Model {}

return [
  success({ x: 1, y: 2 }),
  failure('uh oh')
].map(kase => kase.mapSuccess(data => Foo.deserialize(data)));
~~~

## Case Type Matching

### λmatch
#### (…Case[(…\* -> \*)]) -> Case[…\*] -> \*

The matching function is described in depth in the [case classes](/theory/case-classes#case-class-fundamentals)
theory article. In brief, it takes a series of case class matchers, each of which
contains a function to be called if the given instance is of that class type.

Matches are considered in sequential order as given in the parameter list.

It makes more sense in motion:

~~~
const { up, down } = Case.build('up', 'down');

const matcher = match(
  up(x => `up! ${x}`),
  down(x => `down... ${x}`)
);

return [
  matcher(up(42)),
  matcher(down(-14))
];
~~~

### λotherwise
#### \* -> Otherwise[\*]

`otherwise` is used in conjunction with `match`; when `otherwise` is given instead
of a case class, it will always match. Rather than unapplying the inner value of
the case class to the matching function, the whole case class itself is given.

~~~
const { up, down } = Case.build('up', 'down');

const matcher = match(
  up(x => `up! ${x}`),
  otherwise(c => c)
);

return [
  matcher(up(42)),
  matcher(down(-14))
];
~~~

