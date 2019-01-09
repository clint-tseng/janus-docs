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

#### Unapply: (@Case -> …\* -> Case), Part: String|{ String : Part|Unapply|Array[Part] } => Case.build(…Part): { String: (\* -> Case) }

For more advanced usages, Arrays, Objects, and Functions are allowed inputs alongside
Strings. We will not cover them exhaustively here; please see [this section](/case-classes#advanced-case-classes)
of the Case Classes chapter for full details. In brief:

* Arrays and Objects allow hierarchically structured case class trees, in which
  parent cases cannot be used to represent values but can be used to match against
  any of their children (eg `complete` is the parent of `success` and `failure`).
* Functions can be provided in Object format to create custom `unapply` functions
  that allow arbitrary structures of values to be carried by the case class. (See
  the [constructor](#@constructor) reference or the linked section for samples.)

~~~
const food = Case.build({ fruit: [ 'apple', 'orange' ], vegetable: [ 'kale', 'lettuce' ] });
return [
  food.apple(42),
  food.apple.match(food.apple(42)),
  food.fruit.match(food.apple(42)),
  food.vegetable.match(food.apple(42))
];
~~~

### @withOptions
#### Case.withOptions(options: { String : * }): @Case

As with some other Janus builders, Case allows the pattern `Case.withOptions(…).build(…)`
to express additional `options` for the built artifacts. Right now, only one option
is supported:

* `arity: Integer` allows values from `0` to `3`, and affects the number of values
  that will be taken into and returned back out of all case classes in the set.
  Note that if a custom unapply function is supplied for some case, then this
  option is superceded.

For more information about case arity, please see [this section](/theory/case-classes#arity).

~~~
const { cartesian, polar } = Case.withOptions({ arity: 2 }).build('cartesian', 'polar');

return [
  cartesian(3, 4),
  polar(3.14, 6)
];
~~~

### @constructor
#### new Case(x1: T, (…\* -> (…\* -> U) -> U)): Case[…\*]

The _only_ case in which you should ever have to invoke this constructor directly
is when declaring a [custom unapply](/theory/case-classes#custom-unapply-and-some-internals-).
In all other cases, the builder will provide functions that instantiate Cases for
you.

As described in the linked article, the provided function takes an arbitrary number
of parameters and returns an unapplying function. The first argument taken by the
function should always be provided explicitly as `x1`, to make `match`ing work.

The unapplying function _takes_ a function that expects some arbitrary number of
parameters and returns a result, applies those parameters to the function, and
returns the result.

~~~
const { cartesian, polar } = Case.build({
  cartesian: (Kase) => (x, y, z) => new Kase(x, (f => f(x, y, z))),
  polar: (Kase) => (r, theta, phi) => new Kase(r, (f => f(r, theta, phi)))
});

return [
  cartesian(4, 15, 18),
  polar(1, 3.14, 1.57)
];
~~~

## Instance Value Extraction

### #get
#### .get(): \*|[\*]

In standard case classes (without custom arity or unapply), `.get()` will always
return the single value that the case class was instantiated with. In all other
cases, it will return an array containing the arguments that would have been
provided to a matching function.

~~~
const { normal, custom } = Case.build(
  'normal',
  { custom: (Kase) => (a, b, c) => new Kase(a, (f => f(a, b, c))) }
);

return [
  normal(42).get(),
  custom(1, 2, 4).get()
];
~~~

### #{x}OrElse
#### c: Case[T] => .{x}OrElse(else: U): T|U

`.get()`s the value if the case is of `{x}` type, or else returns the given value
`else`. This is a generally preferred way to extract values, as it has some notion
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
#### .get{X}: \*|Case[\*]

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
#### c: Case[…\*] => c.map(…\* -> U): Case[U]

No matter the type of the case, applies the value(s) to the mapping function and
returns a new case class instance of the same type containing the new mapped value.

Note that no matter the arity of the case originally, the mapping function can
only return a single value and so the resulting case will only contain a single
value. This can be confusing because the type loses its structural meaning. For
this reason, `#map` is not recommended for multi-arity or custom unapply cases.

~~~
const { single } = Case.build('single');
const { multi } = Case.withOptions({ arity: 2 }).build('multi');

return [
  single(42).map(x => x * 2),
  multi(4, 12).map((x, y) => x + y)
];
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

