# Model

`Model`s are extensions of `Map`s which add model-like behavior on top of the
basic key/value and transformation functionality provided by `Map`. For more
information about `Model`s, please see the [full theory chapter](/theory/maps-and-models)
about `Map`s and `Model`s.

All methods supported by `Map`s are supported by `Model`s, and for the most part
will not be repeated here. A future version of this API documentation will incorporate
the `Map` methods into this page. 

In some cases, the `Model` implementation of a `Map` method differs from the `Map`
behavior, and in those cases you will find the method and the differences here.

## Building a Model

`Model`s may be directly instantiated and used, but in many cases you will want
to use `Model.build(…)`, which builds a new `Model` subclass based on the schema
and behavior modifiers you supply. Please see the [chapter on this topic](/theory/maps-and-models#models)
for detailed information.

### @build
#### Model.build(…builder: …({ attributes, bindings, validations } -> void)): @Model

The Model builder takes any number of `builder`s, each of which takes a schema
definition and directly mutates it. The builder functions `attribute`, `bind`,
`validate`, `transient`, and `initial` all conform to this signature, and you
may create your own builder functions so long as they do as well.

* `attributes` is a plain object whose keys are (potentially dot-delimited) property
  names on the eventual `Model` and whose values are `Attribute` classes.
* `bind` is also plain object, but its values are `from` bindings.
* `validations` is an array of `from` bindings which should result in `types.validity`
  values.

Because each builder function is invoked in order and directly mutates the schema
definition, the last write will win should conflicts occur.

~~~ inspect-panel
const MyModel = Model.build(
  bind('y', from('x').map(x => x * 2)),
  initial.writing('z', 8)
);
return new MyModel({ x: 2 });
~~~

### λattribute
#### (key: String, class: @Attribute) -> Schema -> void

* !IMPURE

Used with `Model.build`. Given a string `key` and an `Attribute` `class`, associates
the class to that key in the model schema. For more information about attributes,
please see [the section about them](/theory/maps-and-models#model-attributes) in
the Model theory chapter.

> `attribute` is a function, but we also attach the `Attribute` base class and
> the various type-specific subclasses (eg `Text`) to it, so you can
> find them at, for instance, `attribute.Text`. This is mostly just to keep the
> export namespace somewhat smaller.

~~~
const { EnumAttributeEditView } = stdlib.view($).enumAttribute;

const ExampleModel = Model.build(
  attribute('name', class extends attribute.Text {
    initial() { return 'anonymous'; }
  }),
  attribute('status', class extends attribute.Enum {
    _values() { return [ 'online', 'away', 'offline' ]; }
  })
);

const model = new ExampleModel();
return [
  model.get_('name'),
  new EnumAttributeEditView(model.attribute('status'))
];
~~~

### λbind
#### (key: String, binding: From) -> Schema -> void

* !IMPURE

Used with `Model.build`. Given a string `key` and a `from` binding (which is ready
to have `.point()` called on it), associates that databinding with that key, so
that instances of the model will perform that data binding.

~~~ inspect-panel
const SampleModel = Model.build(
  bind('greeting', from('name').map(name => `hello, ${name}!`))
);

return new SampleModel({ name: 'alice' });
~~~

### λinitial
#### initial: (key: String, value: \*) -> Schema -> void

Used with `Model.build`. Given a string `key` and a `value` of any kind, will
create an `Attribute` class with a `initialValue` of the given `value`.

This is a convenience shortcut which is exactly equivalent to using `attribute()`
to attach a full `Attribute` class with `initialValue() { return value; }`. It
will not work in conjunction with other attribute declarations at the key, including
`attribute` and `transient` (but `bind` works great).

~~~
const SampleModel = Model.build(initial('name', 'anonymous'));
const model = new SampleModel();
return model.get_('name');
~~~

### λinitial.writing
#### initial.writing: (key: String, value: \*) -> Schema -> void

Like `initial`, but also marks `writeInitial` as true.

~~~
const SampleModel = Model.build(initial.writing('name', 'anonymous'));
const model = new SampleModel();
model.get_('name');
return model.serialize();
~~~

### λtransient
#### (key: String) -> Schema -> void

Used with `Model.build`. Given a `key`, creates an `Attribute` class for that key
which is marked `transient`, which excludes the data value from serialization.

This is a convenience shortcut which is exactly equivalent to using `attribute()`
to attach a full `Attribute` class with `get transient() { return true; }`. It
will not work in conjunction with other attribute declarations at the key, including
`attribute` and `initial` (but `bind` works great).

~~~
const SampleModel = Model.build(
  bind('greeting', from('name').map(name => `hello, ${name}!`)),
  transient('greeting')
);

const model = new SampleModel({ name: 'Alice' });
return [
  model.get_('greeting'),
  model.serialize()
];
~~~

### λvalidate
#### (binding: From[types.validity]) -> Schema -> void

* !IMPURE

Used with `Model.build`. Given a `from` binding which results in a `types.validity`
value and is ready to have `.point()` called on it, adds the given validation
check to the Model schema.

~~~
const validIfTrue = (message, f) => (x) => f(x)
  ? types.validity.valid()
  : types.validity.error(message);

const ValidatingModel = Model.build(
  validate(from('name').map(validIfTrue(
    'name must not be blank',
    name => (name != null) && (name !== '')
  ))),
  validate(from('age').map(validIfTrue(
    'age cannot be negative',
    age => age >= 0
  )))
);

const model = new ValidatingModel({ age: -2 });
return model.errors();
~~~

### Trait
#### Builder: (Schema -> void) => Trait(…builder: …Builder): Builder

`Trait` lets you bundle schema building statements together into reusable chunks.
They can nest within each other.

> If you prefer, you can call `Trait.build`; it's exactly the same thing.

~~~ inspect-panel
const HasStatus = Trait(
  attribute('status', class extends attribute.Enum {
    values() { return [ 'online', 'away', 'offline' ]; }
  })
);
const WithGreeting = Trait(
  bind('greeting', from('name').map(name => `hello, ${name}!`)),
  transient('greeting')
);

const Entity = Trait(HasStatus, WithGreeting);

const Person = Model.build(
  Entity,
  initial('name', 'anonymous person')
);

return new Person({ status: 'online' });
~~~

## Creation

### @constructor
#### new Model(): Model

Creates a new empty `Model`. Upon instantiation, the `Model` will call its own
`_preinitialize`, then `_initialize`, if defined.

~~~
return new Model();
~~~

#### new Model(data: Object): Model

Creates a new `Model` instances with the given `data`. Upon instantiation, the
`Model` will call its own `_preinitialize` (if defined), before the `data` has
been populated, then it will `.set(data)` upon itself, then it will call its own
`_initialize` if defined.

~~~
return new Model({ name: 'Alice' });
~~~

### @deserialize
#### Model.deserialize(data: Object): Model

Creates a new `Model` with the given `data`. Unlike the constructor, this method
accounts for the `Model`s schema `Attribute`s; if any `Attribute` has a `@deserialize`
method, then the corresponding input data value will be processed through that
`@deserialize` method before getting assigned to the `Model`.

This means that any nested `attribute.List` or `attribute.Model` attributes will
be correctly inflated as the appropriate class type, and the entire tree of data
will be deserialized according to the schema declaration.

~~~ inspect-panel
const Person = Model.build(
  attribute('friend', class extends attribute.Model {
    static get of() { return Person; }
  })
);

return Person.deserialize({
  name: 'Alice',
  friend: {
    name: 'Bob',
    friend: { name: 'Chelsea' }
  }
});
~~~

## Value Manipulation

### #set
#### .set(key: String, value: \*): void
#### .set({ String : \* }): void
#### .set(key: String): (value: \* -> void)

* !IMPURE
* !INHERITED Map

Inherited from [`Map#set`](map#set).

### #unset
#### .unset(key: String): void

* !IMPURE
* !INHERITED Map

Inherited from [`Map#unset`](map#unset).

### #get
#### .get(key: String): \*|null

* !IMPURE

The `Model` version of `#get` differs from [the `Map` version](/api/map#get) in
precisely one way: if there is no present value but there is an `Attribute` associated
with the requested `key` that provides a `initial` value, then that initial value
will be returned. If the `Attribute` additionally specifies `writeInitial` to be
true, then the initial value will be `.set` directly onto the `Model` before it
is returned.

If there is no value, `null` will be returned.

~~~ inspect-entity
const SampleModel = Model.build(
  initial('status', 'unknown')
);

const model = new SampleModel({ name: 'Alice' });
return [
  model.get('name'),
  model.get('status')
];
~~~

### #get_
#### .get_(key: String): \*|null

* !IMPURE

As with [`#get`](#get), this method differs from [the `Map` Version](/api/map#get_)
in that it will pull an initial value from the schema attribute if defined. Please
see the note on `#get` above for more information.

~~~
const SampleModel = Model.build(
  initial('status', 'unknown')
);

const model = new SampleModel({ name: 'Alice' });
return [
  model.get_('name'),
  model.get_('status')
];
~~~

## Schema Information

### #attribute
#### .attribute(key: String): Attribute?

Attempts to find an `Attribute` declaration for the given `key`, and if found
returns the attribute class instance that relates to the given `key`.

> Attribute classes are only instantiated lazily on-demand, and then memoized
> for future returns.

~~~
const ExampleModel = Model.build(
  attribute('name', attribute.Text)
);

const model = new ExampleModel({ name: 'Alice' });
return model.attribute('name').getValue_();
~~~

### #attributes
#### .attribute(): Array[Attribute]

Returns all attribute instance classes for this model. If they have not yet been
instantiated via [`#attribute`], this will instantiate all of them.

~~~
const ExampleModel = Model.build(
  attribute('name', attribute.Text),
  attribute('age', attribute.Number)
);

const model = new ExampleModel({ name: 'Alice', age: 26 });
return model.attributes();
~~~

## Binding and Context

### #pointer
#### .pointer(): types.from -> Varying

Returns a function that can be fed to a `from`-binding's `.point()` resolver to
contextualize the `from`-binding within the given model instance, and yield a
`Varying` result of the bound computation.

The `types.from.app` case will only be resolved if the model instance has an
`options.app` property present.

In general, there is little reason to manually call this method: the Model and
databinding system will both perform this call on your behalf when appropriate.

~~~
const binding = from('name').map(name => `hello, ${name}!`);
const model = new Model({ name: 'Alice' });
return binding.all.point(model.pointer());
~~~

## Model Validation

### #validations
#### .validations(): List[types.validity]

Returns a `List` of validation results, in the form of `types.validity` values.
The validation rules themselves are declared when the Model is built, via the
[validate](#validate) schema builder function.

The list will be eagerly updated as the model validation state changes, until it
or the parent model is `.destroy()`ed.

Should no validation rules exist, an empty `List` will be returned.

~~~
const validIfTrue = (message, f) => (x) => f(x)
  ? types.validity.valid()
  : types.validity.error(message);

const ValidatingModel = Model.build(
  validate(from('name').map(validIfTrue(
    'name must not be blank',
    name => (name != null) && (name !== '')
  ))),
  validate(from('age').map(validIfTrue(
    'age cannot be negative',
    age => age >= 0
  )))
);

const model = new ValidatingModel({ age: 4 });
return inspect.panel(model);
~~~

### #errors
#### .errors(): List[\*]

Like [#validations](#validations), but returns only validation failures (values
of `types.validity.error` type) and returns the inner contents of those case classes
rather than the case classes themselves.

The list will be eagerly updated as the model validation state changes, until it
or the parent model is `.destroy()`ed.

Should there be no outstanding validation errors, the `List` will be empty.

~~~
const validIfTrue = (message, f) => (x) => f(x)
  ? types.validity.valid()
  : types.validity.error(message);

const ValidatingModel = Model.build(
  validate(from('name').map(validIfTrue(
    'name must not be blank',
    name => (name != null) && (name !== '')
  ))),
  validate(from('age').map(validIfTrue(
    'age cannot be negative',
    age => age >= 0
  )))
);

const model = new ValidatingModel({ age: -1 });
return model.errors();
~~~

### #valid
#### .valid(): Varying[Boolean]

Like [#errors](#errors), but returns just a `Varying[Boolean]` indicating whether
the model is presently considered valid or not. It is valid if there are no failing
validation rules.

~~~
const ValidatingModel = Model.build(
  validate(from('name').map(name => ((name == null) || (name == ''))
    ? types.validity.error('name must not be blank')
    : types.validity.valid()
  ))
);

const model = new ValidatingModel();
// model.set('name', 'Alice');
return model.valid();
~~~

## Shadow Copying

All these methods are [inherited from `Map`](/api/map#shadow-copying).

### #shadow
#### .shadow(): Model
#### .shadow(T: @+Model): T

* !INHERITED Map

Inherited from [`Map#shadow`](map#shadow).

### #with
#### .with({ String: \* }): Map

* !INHERITED Map

Inherited from [`Map#with`](map#with).

### #revert
#### .revert(key: String): void

* !IMPURE
* !INHERITED Map

Inherited from [`Map#revert`](map#revert).

### #original
#### .original(): Model

* !INHERITED Map

Inherited from [`Map#original`](map#original).

## Mapping and Transformation

### #mapPairs
#### .mapPairs(f: (key: String, value: T -> U)): Model

* !INHERITED Map

Inherited from [`Map#mapPairs`](map#mapPairs).

### #flatMapPairs
#### .flatMapPairs(f: (key: String, value: T -> U)): Model

* !INHERITED Map

Inherited from [`Map#flatMapPairs`](map#flatMapPairs).

### #serialize
#### .serialize(): {\*}

Returns a plain Javascript Object representation of this model. For any model
`Attribute`s for which a `#serialize` method is defined, that method will be used
to process that data value prior to output.

Any attributes marked `transient` will be omitted from the result.

~~~
const SampleModel = Model.build(
  attribute('status', class extends attribute.Text {
    serialize() { return this.getValue_().toUpperCase(); }
  }),
  bind('greeting', from('name').map(name => `hello, ${name}!`)),
  transient('greeting')
);

return (new SampleModel({ name: 'Alice', status: 'unknown' })).serialize();
~~~

## Enumeration

### #enumerate
#### .enumerate(): Set[String]

* !INHERITED Map

Inherited from [`Map#enumerate`](map#enumerate).

### #keys
#### .keys(): Set[String]

* !INHERITED Map

Inherited from [`Map#keys`](map#keys), and an alias for [`#enumerate`](#enumerate).

### #enumerate_
#### .enumerate_(): Array[String]

* !INHERITED Map

Inherited from [`Map#enumerate_`](map#enumerate_).

### #keys_
#### .keys_(): Array[String]

* !INHERITED Map

Inherited from [`Map#keys_`](map#keys_), and an alias for [`#enumerate_`](#enumerate_).

### #values
#### .values(): List[\*]

* !INHERITED Map

Inherited from [`Map#values`](map#values).

### #values_
#### .values_(): Array[\*]

* !INHERITED Map

Inherited from [`Map#values_`](map#values_).

### .length
#### .length: Varying[Int]

* !INHERITED Map

Inherited from [`Map#length`](map#length).

### .length_
#### .length_: Int

* !INHERITED Map

Inherited from [`Map#length_`](map#length_).

## Change Detection

### #diff
#### .diff(other: Model): Varying[Boolean\*]

* !INHERITED Map

Inherited from [`Map#diff`](map#diff).

### #modified
#### .modified(): Varying[Boolean\*]

* !INHERITED Map

Inherited from [`Map#modified`](map#modified).

## Extending Model (Overrides)

### #\_preinitialize
#### .\_preinitialize(): void

If implemented, this method is called immediately after class instantiation, before
the initial `data` provided to the constructor is populated into the model via `#set`.

This can be useful if some reaction needs to occur when some data is seen, even
when given as part of the initial construction.

In general, using Model [databinding](#bind) is a more effective, foolproof way
to populate computed data. But in some cases, as in the example below, using a
reaction in the preinitializer can be more appropriate.

~~~ inspect-panel
class PlayerModel extends Model {
  _preinitialize() {
    this.reactTo(this.get('playing'), isPlaying => {
      if (isPlaying === false)
        this.set('pausedAt', (new Date()).getTime());
    });
  }
}

const model = new PlayerModel({ playing: false });
return model;
~~~

### #\_initialize
#### .\_initialize(): void

If implemented, this method is called as the final step of model class instantiation,
_after_ the initial `data` provided to the constructor has been populated into the
model via `#set`.

As with [#preinitialize](#_preinitialize) this can be useful for setting up internal
reactions to data changes, but as `_initialize` is called after the initial data
load, it can be used effectively ignore the constructed state of the model data.

~~~ inspect-panel
class PlayerModel extends Model {
  _initialize() {
    this.reactTo(this.get('playing'), false, isPlaying => {
      if (isPlaying === false)
        this.set('pausedAt', new Date());
    });
  }
}

const model = new PlayerModel({ playing: false });
return model;
~~~

