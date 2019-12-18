# from

`from` expressions, or `from`-chains, are ways to express computations without
explicitly referencing particular instances of input resources. Instead, descriptors
of required input values are given, and whenever the computation is required
[`#point`](#point) can be invoked to contextually map those descriptors onto some
set of concrete values (typically `Varying`s), and a `Varying` is obtained as a
result.

A full chapter describing `from` expressions can be found [here](/theory/from-expressions).

While a default set of useful descriptor classes (`from.get`, `from.app`, etc)
are provided by default, [`from.build()`](#@build) can be used to build custom
descriptor chains. When you see `{x}` in method names below, this is a placeholder
for your set of given descriptor classes.

## Part Chaining

There are two ways to start a `from` chain: you can invoke `from()` directly to
create a dynamically typed descriptor, or you can call `from.{x}()` to create a
specifically-typed descriptor.

### from
#### T -> FromPart[…\*, dynamic[T]]

Calling `from()` directly will create a new `from` expression with one resource
descriptor of type `dynamic`.

With the default set of `from` descriptors and the standard `Model` or `DomView`
`point` implementations, three input types are supported:

* Given a Function `(subject -> \*)`, the function will be invoked with the subject
  (typically a `Map` or `Model`) as the only parameter. The return value may be,
  but is not required to be, a `Varying`.
* Given a `String`, that String will be treated as a reference to a data key on
  the subject, and that data value will be watched.
* Given any other kind of value, [`Varying.of`](Varying#@of) will be called on
  the value and the result is used as the resource.

> If `from.build()` is used to build an alternative chaining interface and a case
> with a name of `dynamic` is not provided, then `from` will not be an invocable
> Function, but instead a plain Object.

~~~
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return [
  from(model => model.get('name')),
  from('age'),
  from(42)
].map(point);
~~~

### #{x}
#### .{x}(value: T): FromPart[…\*, {x}[T]]

As mentioned above, the available `from` chain methods can be customized via [`@build`](#@build),
and so this method signature is somewhat confusingly named. In essence, each
case supplied to the builder becomes directly a chaining method on `from`.

The default set, when used with the default `DomView` or `Model` `point`, consists
of the following methods:

* `from.get(key: String)` will `.get(key)` on the subject.
* `from.attribute(key: String)` will call `.attribute(key)` on the `Model`,
  resulting in the [`Attribute`](attribute#Attribute) instance associated with
  the key rather than the data at the key.
* `from.varying(v: Varying[\*]|(subject → Varying[\*]))` accepts either a
  `Varying` instance, or (more likely) a Function that takes the `subject` and
  returns a `Varying` instance.
* `from.app()` will return the `App` instance if it is known. Typically, this
  will only work on `DomView` and View Models, but will also work with any `Model`
  whose `options.app` has been set.
* `from.app(key: String)` is like `from.app()`, but will watch the given `key`
  on the `App` Model.
* `from.self()` gives the `DomView` itself as the value in `DomView`s, or the
  `Model` itself in `Model`s.
* `from.subject(key: String)` gives the `.subject` of the `DomView` in a `DomView`, 
  or the true View subject in a View Model (which is the value stored on the
  View Model at `'subject'`). If a `key` is given, that key of the subject will
  be `.get`ted.

Here we demonstrate each of these:

~~~
const TestModel = Model.build(
  attribute('name', attribute.Text),
  attribute('age', attribute.Number)
);

const app = new App();
const model = new TestModel({ name: 'Spot', age: 7 }, { app });
const point = (expr) => expr.all.point(model.pointer());

return [
  from.get('name'),
  from.attribute('name'),
  from.varying(Varying.of(42)),
  from.varying(subject => subject.enumerate().length),
  from.app(),
  from.app('views'),
  from.self()
].map(point);
~~~

### #and
#### x: FromPart => x.and: from

At any point after a `from` chain has been started and before `.all` has been
called, you can call `.and` to add a new resource descriptor to the chain.

`.and` works in exactly the same way as `from`: it can be called as a function
(`.and(…)`) in which case a `dynamic` descriptor is created (just like `from(…)`),
or a specifically typed descriptor can be added instead by referencing it by name
(`.and.self()`, for instance, to match `from.self()`).

~~~
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return point(from('name').and('age').all.map((name, age) => name + age));
~~~

## Part Mapping

Each individual resource descriptor in a `from` expression can be separately mapped
before it is aggregated into the `.all` mapping. The mapping transformations are
recorded, and applied when `point` is performed.

The most basic of these are `map` and `flatMap`; the rest of merely convenience
methods that prebake some useful mappings.

### #map
#### x: FromPart[…\*, T] => x.map(T -> U): FromPart[…\*, U]

Maps the value represented by the current `from` fragment. This method doesn't
do anything at first besides remember the computation; when the `from` expression
as a whole is `point`ed and the data resource in question is resolved into a
`Varying`, the mapping function given here is applied to that `Varying`.

~~~
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return [
  from('name').map(name => name + '!'),
  from('age').map(age => age * 7)
].map(point);
~~~

### #flatMap
#### x: FromPart[…\*, T] => x.flatMap(T -> U|Varying[U]): FromPart[…\*, U]

Like `#map`, but should the mapping function return a `Varying`, it will be
flattened, just as with [`Varying#flatMap`](Varying#flatMap).

~~~
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return [
  from.self().map(model => model.enumerate().length),
  from.self().flatMap(model => model.enumerate().length)
].map(point);
~~~

### #get
#### x: FromPart[…\*, Enumerable] => x.get(key: String): FromPart[…\*, U]

Attempts to map the current value by calling `.get(key)` on it. If the value
does not exist or does not support `#get`, `null` will be returned.

This is roughly equivalent to `.flatMap(model => model.get(key))`, but with
the abovementioned safety checks.

~~~
const model = new Model({
  nested: new Model({
    name: 'nested once',
    again: new Model({ name: 'nested twice' })
  })
});
const point = (expr) => expr.all.point(model.pointer());

return [
  from('nested').get('name'),
  from('nested').get('again').get('name')
].map(point);
~~~

### #attribute
#### x: FromPart[…\*, Model] => x.attribute(key: String): FromPart[…\*, Attribute]

Attempts to map the current value by calling `.attribute(key)` on it. If the value
does not exist or does not support `#attribute`, `null` will be returned.

This is roughly equivalent to `.map(model => model.attribute(key))`, but with
the abovementioned safety checks.

~~~
const Dog = Model.build(
  attribute('name', attribute.Text)
);

const model = new Model({
  dog: new Dog({ name: 'Spot', age: 7 })
});
const point = (expr) => expr.all.point(model.pointer());

return [
  from('dog').attribute('name'),
  from('dog').attribute('age')
].map(point);
~~~

### #pipe
#### x: FromPart[…\*, T] => x.pipe(Varying[T] -> Varying[U]): FromPart[…\*, U]

Equivalent to [`Varying#pipe`](Varying#pipe), and mostly used to use `Varying`
modifiers like delays, filters, or debounces.

~~~
const { filter } = stdlib.varying;
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return point(from('age').pipe(filter(age => age >= 0)));
~~~

### #asVarying
#### x: FromPart[…\*, T] => x.asVarying(): FromPart[…\*, Varying[T]]

Maps the current value by exposing the underlying `Varying` that it is backed by.

This is primarily useful when passing this data resource along to some other process
(say, constructing a derived list) that accepts a `Varying`, as it allows that
process to be performed once with a `Varying` input rather than every time this
value changes.

This example illustrates the point; were we not to use `.asVarying()`, the `.take`
operation would initialize a new `List` every time `age` changes. But with `.asVarying()`,
it only gets initialized once, and `.take` deals with the changes internally.

~~~
const birthdays = new List([
  'Outrageous One',
  'Terrific Two',
  'Therapeutic Three',
  'Fantastic Four',
  'Finnicky Five',
  'Sinister Six'
]);
const model = new Model({ name: 'Spot', age: 3 });
const point = (expr) => expr.all.point(model.pointer());

return point(from('age').asVarying().map(age => birthdays.take(age)));
~~~

## Chain Finalization

Once your resources are all chained together, `.all` lets you perform a number
of operations on the set of values as a whole: `map`, `flatMap`, and `point`.

It is not always necessary to `.all` a chain, when using processes like `bind`
or `template` that perform `point` on your behalf, and your `from` expression
only references a single value.

But when chaining together multiple values, `.all.map(…)` and `.all.flatMap(…)`
to map the values to a final output is a common pattern.

### .all
#### x: FromPart[…\*] => x.all: From[…\*]

Available at any point in a `from` expression, calling `.all` moves the chain on
to the terminus finalization phase, at which point `#map` and `#flatMap` can be
used to reduce the multiple data inputs to a single final output, and `#point`
can be called to reify the expression into an actual `Varying`.

Calling `.all` again in the same chain just returns the chain itself as-is.

### #map !AS #map-all
#### x: From[…\*] => x.map(…\* -> U): From[U]

Maps the chained data.

The first time `.all.map(…)` or `.all.flatMap(…)` are called on a `from` expression,
the mapping function will receive as many input arguments as there are data inputs
on the chain. Subsequent calls will always take one input and return one output.

~~~
const model = new Model({ name: 'Spot', age: 7 });
const point = (expr) => expr.all.point(model.pointer());

return [
  from('name').and('age').all.map((name, age) => `${name} is ${age} years old`),
  from('name').and('age').all.map((name, age) => name + age).map(x => x.toUpperCase())
].map(point);
~~~

### #flatMap !AS #flatMap-all
#### x: From[…\*] => x.flatMap(…\* -> U|Varying[U]): From[U]

Like `#map`, but should the mapping function return a `Varying` it will be flattened,
just like [`Varying#flatMap`](Varying#flatMap).

As with `#map`, the first invocation of `map` or `flatMap` will receive as many
arguments as there are data values on the chain, while subsequent calls will only
receive the one mapped value as their input.

~~~
const model = new Model({
  dog: new Model({ name: 'Spot', age: 7 }),
  lookup: new Map({
    Spot: 'good name',
    Woofers: 'great name'
  })
});
const point = (expr) => expr.all.point(model.pointer());

return point(
  from('dog').get('name')
    .and('lookup')
    .all.flatMap((name, lookup) => lookup.get(name))
);
~~~

### #point
#### x: From[…\*] => x.point(pointer: (\* -> Varying[\*])): UnreducedVarying[…\*]

Covered in depth in [this section](/theory/from-expressions#pointing-from-expressions)
of the `from` expression chapter. In brief, `pointer` is a function that takes
the data resource descriptors, wrapped with the case classes that correspond with
the method with which each descriptor was created, and returns a `Varying` that
concretely represents that data value.

All mapping operations are carried out at this point.

The final result will be a `Varying` of some sort. If only one data resource was
chained, or if `.all.map(…)` or `.all.flatMap(…)` have been supplied to reduce
the data values to a single output value, then a plain `Varying` with a single
value is returned. But if multiple data values exist at the end of the chain, an
`UnreducedVarying` with all values is the result.

~~~
const expr = from.get('name')
  .and.get('age')
  .all.map((name, age) => `${name} is ${age} years old`);

const model = new Model({ name: 'Spot', age: 7 });
return expr.point(match(
  types.from.get(x => model.get(x))
));
~~~

## Custom Chaining

Should the default set of chaining methods (`get`, `self`, `app`, and so on as
described [here](#{x})) are unsatisfactory, it is possible to build your own.

### @build
#### from.build({ String : (\* -> Case) }): from

Described more fully [here](/theory/from-expressions#building-a-custom-from).

Given an object with names mapped to `Case` functions (exactly as returned by
[`Case@build`](Case@build)), returns a new `from` chain that uses the given names
and Cases as the chaining methods instead.

~~~
const cases = Case.build('red', 'blue', 'green');
const myfrom = from.build(cases);

const expr = myfrom.red('name')
  .and.blue('name')
  .and.green('name')
  .all.map((...xs) => xs.join(', '));

const red = new Model({ name: 'red' });
const blue = new Model({ name: 'blue' });
const green = new Model({ name: 'green' });

return expr.point(match(
  cases.red(x => red.get(x)),
  cases.blue(x => blue.get(x)),
  cases.green(x => green.get(x))
));
~~~

