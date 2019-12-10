# Attribute

Attributes define behavior for particular data members on Models. Among these
are serialization, default values, and other type-specific details like Enumerable
options. Detailed information about attributes can be found [in their theory
chapter](/theory/maps-and-models#model-attributes).

The default attribute classes can all be found as members of the package function
`attribute`; eg: `Attribute` is at `attribute.Attribute`, `TextAttribute` is under
`attribute.Text`, and so on.

All the type-specific attribute classes derive from `Attribute`.

## Attribute Base Class

Found at `attribute.Attribute`, the Attribute base class defines:

* Methods for accessing and modifying the value it represents on its parent Model,
  which are likely applicable to all subclasses,
* Rudimentary serialization/deserialization, which will often be overridden in
  defining new general attribute types, and
* Some empty placeholders for default value definition, which will often only get
  overridden at the time of Model definition in anonymous classes.

### @constructor
#### new Attribute(model: Model, key: String): Attribute

Creates and returns a new `Attribute` instance bound to the given `key` on the
given `model`.

Typically, rather than construct your own instance, you would request a `Model`
to do this for you, via `#attribute`.

~~~ inspect-entity
return new attribute.Attribute();
~~~

### #getValue
#### .getValue(): Varying[\*]

Equivalent to calling `model.get(key)` on the `model` and `key` this `Attribute`
instance is bound to.

> When `Model` performs a `get_` operation, it checks to see if it has an attribute
> defined for the given `key` and uses its default if it exists. But because an
> `Attribute` can be manually constructed against any `Model`/`key` pair even if
> the model does not know about the attribute, then in this case `model.get_` would
> return `null` rather than the attribute default. Because of this, `Attribute`
> has its own logic to enforce its own default when `#getValue_` is called.

~~~ inspect-entity
const model = new Model({ x: 42 });
const exampleAttr = new attribute.Attribute(model, 'x');
return exampleAttr.getValue();
~~~

### #getValue_
#### .getValue_(): \*|null

* !IMPURE

Gets the associated value from the `model` and `key` this `Attribute` is bound
to. Please see the note attached to [`#getValue`](#getValue) above.

~~~
const model = new Model({ x: 42 });
const exampleAttr = new attribute.Attribute(model, 'x');
return exampleAttr.getValue_();
~~~

### #setValue
#### .setValue(value: \*): void

* !IMPURE

Equivalent to calling `model.set(key, value)` on the `model` and `key` this `Attribute`
instance is bound to.

~~~ inspect-panel
const model = new Model({ x: 42 });
const exampleAttr = new attribute.Attribute(model, 'x');
exampleAttr.setValue(17);
return model;
~~~

### #unsetValue
#### .unsetValue(): void

* !IMPURE

Equivalent to calling `model.unset(key)` on the `model` and `key` this `Attribute`
instance is bound to.

~~~ inspect-panel
const model = new Model({ x: 42 });
const exampleAttr = new attribute.Attribute(model, 'x');
exampleAttr.unsetValue();
return model;
~~~

### #serialize
#### .serialize(): \*|null

Returns the associated value of this `Attribute` in a type and format appropriate
for wire transfer. By default, no transformation is applied to the value: it is
passed through as-is.

> If you plan on overriding this method, please see the notes on `transient` below.

~~~
const model = new Model({ x: 42 });
const exampleAttr = new attribute.Attribute(model, 'x');
return exampleAttr.serialize();
~~~

### .transient
#### .transient: Boolean

A class instance property, `transient` can be set to `true` to indicate that this
property should never be included in serialized representations of the parent
`Model`. This can be useful for temporary or computed values.

> The `transient` property is checked when `Attribute#serialize` is called. If
> you override that method, you will need to manually check and enforce the property
> yourself.

~~~
class TransientAttribute extends attribute.Attribute {
  get transient() { return true; }
};

const model = new Model({ x: 42 });
const exampleAttr = new TransientAttribute(model, 'x');
return exampleAttr.serialize();
~~~

### @deserialize
#### Attribute.deserialize(value: \*): \*

Given a single wire-format value to be written to the `Model` in the context of
this `Attribute` class, `@deserialize` returns the value that should _actually_
be written. In general, this method should undo whatever value transformation is
performed by `#serialize`.

By default, this method just passes the value through.

~~~ inspect-panel
// simplified from the actual implementation (does not handle null/transient):
class DateAttribute extends attribute.Attribute {
  serialize() { return this.getValue_().getTime(); }
  static deserialize(value) { return new Date(value); }
}

const ModelWithDate = Model.build(
  attribute('date', DateAttribute)
);

return ModelWithDate.deserialize({ date: 1547083603524 }); // TODO: Date class does not render
~~~

### #default
#### .default(): \*?

Returns the default value for this `Attribute`; if there is no value on the `model`
at the expected `key` and [`Model#get_`](/api/model#get_) or [`Attribute#getValue_`](#getValue_)
are used, then this value should be returned instead.

Though this value is returned, it is not actually written to the `model`. To request
that behavior, declare `.writeDefault = true` (see below).

~~~
class AttributeWithDefault extends attribute.Attribute {
  default() { return 42; }
}
const ModelWithDefault = Model.build(
  attribute('x', AttributeWithDefault)
);

const model = new ModelWithDefault();

return [
  model.get_('x'),
  model.attribute('x').getValue_(),
  model.serialize()
];
~~~

### .writeDefault
#### .writeDefault: Boolean

`false` by default, `writeDefault` governs whether the default value as given by
`#default` (above) should be written to the `model` in addition to getting returned.

Only when the default value is actively requested and returned to some consumer
will the write operation be performed. Default values are not written during, for
example, `Model` construction or deserialization.

~~~
class AttributeWithDefault extends attribute.Attribute {
  default() { return 42; }
  get writeDefault() { return true; }
}
const ModelWithDefault = Model.build(
  attribute('x', AttributeWithDefault)
);

const model = new ModelWithDefault();

return [
  model.serialize(),
  model.get_('x'),
  model.attribute('x').getValue_(),
  model.serialize()
];
~~~

### .model
#### .model: Model

Set at construction by the `Model` that creates the `Attribute` instance, this
property records the `Model` that the instance is attached to. It is not a good
idea to change this value.

~~~
class SampleModel extends Model.build(
  attribute('prop', attribute.Attribute)
) {}

const model = new SampleModel();
return model.attribute('prop').model;
~~~

### .key
#### .key: Model

Set at construction by the `Model` that creates the `Attribute` instance, this
property records the data property key on that `Model` that the instance is attached
to. It is not a good idea to change this value.

~~~
class SampleModel extends Model.build(
  attribute('prop', attribute.Attribute)
) {}

const model = new SampleModel();
return model.attribute('prop').key;
~~~

## Text Attribute

Found at `attribute.Text`, this attribute type represents `String` values.

It does not override any default behavior, nor does it provide any additional
methods. It is still useful, however, since the Janus [Standard Library](/api/stdlib)
Text editing view components will by default register against this classtype [in
the View Library](/theory/app-and-applications#app-view-management).

~~~ inspect-plain
const model = new Model();
const attr = new attribute.Text(model, 'key');
return [
  new stdlib.view($).textAttribute.TextAttributeEditView(attr),
  inspect.panel(model)
];
~~~

## Enum Attribute

Found at `attribute.Enum`, this attribute type represents values which must be
exactly one of a given set of allowed values. The values may be of any type.

Key to the `Enum` Attribute is the method `values`, which declares the allowed
values. It also adds the `nullable` property, but it does not override any default
`Attribute` methods.

### #_values
#### Listlike[T]: Array[T]|List[T], Binding[U]: U|Varying[U]|From[U] => .values(): Binding[Listlike[T]]

Override to specify the allowable values for this `Enum` attribute. They may be
of any type.  Either an `Array` or a `List` may be returned, and they may be
directly given, or wrapped in a `Varying`, or wrapped in a `from`-binding
expression. This allows the allowable values to change based on other conditions
or inputs.

> Note, however, that as of time of writing, there is no direct enforcement that
> the value written to the `model` actually conforms to one of the given values.
> Rather, like the `nullable` property described below, the `#_values` method is
> used by the Janus [Standard Library](/api/stdlib) editor components to determine
> what options to present to the user.

Below, we demonstrate the return of a plain Array gated on a condition elsewhere
on the model. Another common approach is to `map` a `List`.

~~~ inspect-plain
class SampleEnumAttr extends attribute.Enum {
  _values() {
    return from('restricted').map(restricted => restricted
      ? [ 'anonymous', 'user' ]
      : [ 'anonymous', 'user', 'moderator', 'administrator' ]);
  }
}

const model = new Model({ restricted: false, role: 'user' });
const attr = new SampleEnumAttr(model, 'role');
return [
  new stdlib.view($).enumAttribute.EnumAttributeEditView(attr),
  inspect.panel(model)
];
~~~

### #nullable
#### .nullable: Boolean

The instance property `nullable` indicates that `null` should be provided as an
option for the user to choose from. It is respected by the Janus [Standard Library](/api/stdlib)
editor components.

Please see the note on `#values` above regarding the enforcement of this property.

~~~ inspect-plain
const TestModel = Model.build(
  attribute('color', class extends attribute.Enum {
    _values() { return [ 'red', 'orange', 'yellow', 'green', 'blue', 'purple' ]; }
    get nullable() { return true; }
  })
);

const model = new TestModel();
return new stdlib.view($).enumAttribute.EnumAttributeEditView(model.attribute('color'));
~~~

## Number Attribute

Found at `attribute.Number`, this attribute type represents `Number` values.

It does not override any default behavior, nor does it provide any additional
methods. It is still useful, however, since the Janus [Standard Library](/api/stdlib)
Text editing view components will by default register against this classtype [in
the View Library](/theory/app-and-applications#app-view-management).

~~~ inspect-plain
const model = new Model();
const attr = new attribute.Number(model, 'key');
return [
  new stdlib.view($).numberAttribute.NumberAttributeEditView(attr),
  inspect.panel(model)
];
~~~

## Boolean Attribute

Found at `attribute.Boolean`, this attribute type represents `Boolean` values.

It does not override any default behavior, nor does it provide any additional
methods. It is still useful, however, since the Janus [Standard Library](/api/stdlib)
Text editing view components will by default register against this classtype [in
the View Library](/theory/app-and-applications#app-view-management).

~~~ inspect-plain
const model = new Model();
const attr = new attribute.Boolean(model, 'key');
return [
  new stdlib.view($).booleanAttribute.BooleanAttributeEditView(attr),
  inspect.panel(model)
];
~~~

## Date Attribute

Found at `attribute.Date`, this attribute type represents `Date` values.

The `Date` attribute works with native JS `Date` objects as its values. It overrides
`#serialize` and `@deserialize` to use epoch milliseconds (via `Date#getTime` and
`Date@constructor` respectively) as its wire format.

Otherwise, it does not override or add to the standard `Attribute` class.

Due to their complexity and particularlity, no default editor is provided for
the `Date` attribute in the standard library.

~~~
const ModelWithDate = Model.build(
  attribute('date', attribute.Date)
);

const model = new ModelWithDate({ date: new Date() });
return model.serialize();
~~~

## Model Attribute

Found at `attribute.Model`, this attribute type represents `Model` instance values.

The `Model` attribute indicates that the associated `model` value at the attribute
`key` should be an instance of a particular `Model` class. That classtype is given
by the class property `@modelClass`, and defaults to `Model`.

The `writeDefault` property is set to `true`, and it is inadvisable to change this:
if a `default` value is provided (`default() { return new ChildModel(); }`, for
instance), but `writeDefault` is set to `false`, then that model instance is generated
and immediately discarded with each operation. So code like `.get_('child').set('x', 42)`
will look like it failed on a subsequent `.get_('child')`, since this call actually
generates a new model instance.

(There is _not_ a `default` declared on the base `ModelAttribute` class.)

The `#serialize` and `@deserialize` methods are overridden to use the `#serialize`
and `@deserialize` methods on the `modelClass` itself; ie `model.serialize()` and
`ModelClass.deserialize(data)`. There is generally little reason to override these;
it is probably more productive to override the respective methods on the `Model`
class itself.

### @modelClass
#### .modelClass: @Model

The `modelClass` class property defines the expected `Model` classtype for this
attribute. This is used mostly in serialization and deserialization.

This property defaults to the value `Model`.

~~~ inspect-panel
class ChildWidget extends Model {}
const ParentWidget = Model.build(
  attribute('child', class extends attribute.Model {
    static get modelClass() { return ChildWidget; }
  })
);

return ParentWidget.deserialize({ child: { x: 42 } });
~~~

### @of
#### .of(class: @Model): @ModelAttribute

A convenience method that generates a `ModelAttribute` classtype with the given
`class` as the `modelClass`. Compare this sample to the previous one, just above.

~~~ inspect-panel
class ChildWidget extends Model {}
const ParentWidget = Model.build(
  attribute('child', attribute.Model.of(ChildWidget))
);

return ParentWidget.deserialize({ child: { x: 42 } });
~~~

## List Attribute

Found at `attribute.List`, this attribute type represents `List` instance values.

The `ListAttribute` behaves exactly like the `ModelAttribute`, but it operates
on `List`s instead of `Model`s. All the notes provided on the [Model attribute](#model-attribute)
above apply, including the notes on `default`, `writeDefault`, `serialize`, and
`deserialize`. Please refer to those.

### @listClass
#### .listClass: @List

The `listClass` class property defines the expected `List` classtype for this
attribute. This is used mostly in serialization and deserialization.

This property defaults to the value `List`.

~~~ inspect-panel
class ChildWidget extends Model {}
const ChildWidgets = List.of(ChildWidget);

const ParentWidget = Model.build(
  attribute('children', class extends attribute.List {
    static get listClass() { return ChildWidgets; }
  })
);

return ParentWidget.deserialize({ children: [{ x: 42 }] });
~~~

### @of
#### .of(class: @List): @ListAttribute

A convenience method that generates a `ListAttribute` classtype with the given
`class` as the `listClass`. Compare this sample to the previous one, just above.

~~~ inspect-panel
class ChildWidget extends Model {}
const ChildWidgets = List.of(ChildWidget);

const ParentWidget = Model.build(
  attribute('children', attribute.List.of(ChildWidgets))
);

return ParentWidget.deserialize({ children: [{ x: 42 }] });
~~~

## Reference Attribute

Found at `attribute.Reference`, the Reference Attribute refers to values that exist
somewhere _else_, defines how to get those values, and does some work to automatically
do the work to get the value and drop it on its parent `model` when the value is
observed. The value may be of any type.

Please see the chapter on [Requests, Resolvers, and References](/theory/requests-resolvers-references)
for a complete explanation.

Generally, the only method you should override on `Reference` attributes is `request`,
which defines how to actually fetch the referenced value. You can alternatively
use the convenience class method `@to`.

Also provided is the `autoResolve` property, which may be set to `false` if you
only wish the value to resolve when manually requested via code invocation.

By default, `transient` is set to `true` on `Reference` attributes. Semantically,
it is generally inadvisable to change this, since the value may or may not exist
based on potentially difficult-to-predict conditions, and should generally treated
as read-only.

### #request
#### Binding[U]: U|Varying[U]|From[U] => .request(): Binding[Request]

A method which must be overridden in order to use a `Reference` attribute (or,
you can use the convenience method `@of` which overrides it for you). This method
must return the `Request` that, when resolved with an `App`, gives the value that
ought to be set onto the `model`.

The `Request` may be given directly, or wrapped in a `Varying`, or wrapped in a
`from`-binding expression which will be given the `point` context of the `model`.

If this isn't making sense, please see the [full chapter](/theory/requests-resolvers-references)
on this topic. The following sample is an abridged version of a sample from that
article; more context is provided there.

~~~
const Site = Model.build(
  attribute('article', class extends attribute.Reference {
    request() { return from('path').map(path => new ArticleRequest(path)); }
  }));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  $.getJSON(request.path)
    .done((data) => { result.set(types.result.success(Model.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

const app = new App();
app.resolvers.register(ArticleRequest, articleResolver);

const site = new Site({ path: '/api/attribute.json' });
site.autoResolveWith(app);
return site.get('article').map(article => article ? article.keys() : null);
~~~

### @to
#### ReferenceAttribute.to(request: Request|Varying[Request]|From[Request]): @ReferenceAttribute

A convenience method which, given a `request` (or one wrapped in a `Varying` or
a `from`-binding expression) declares a `ReferenceAttribute` subclass which has
the `#request` method overridden to return your given value, and gives you the
subclass.

~~~ noexec
// try copy-pasting this over the first block in the sample above:

const Site = Model.build(
  attribute('article', attribute.Reference.to(
    from('path').map(path => new ArticleRequest(path))))
);
~~~

### .autoResolve
#### .autoResolve: Boolean

Defaults to `true`. If set to `false`, the parent `model` will skip this attribute
when it performs [`Model#autoResolveWith`](/api/model#autoResolveWith) operations.
In other words, `App`s fed implicitly to all model attributes via `#autoResolveWith`
will not propagate to this attribute.

> More information can be found in [this section](/theory/app-and-applications#app-resolver-handling)
> of the full chapter on this topic.

### #resolveWith
#### .resolveWith(app: App): void

* !IMPURE

This method provides the `Reference` attribute with the `App` context it would
need to resolve its `Request` into actual data. It may only be called once.

> In most cases, you will not call this method yourself; it will be automatically
> called by [`Model#autoResolveWith`](/api/model#autoResolveWith), which in turn
is automatically called by
> the 

Calling this method does _not_ cause `Request` resolution. It only enables the
`Reference` attribute to perform resolution and fetch the data _if it decides
it needs to_.

> More information can be found in [this section](/theory/app-and-applications#app-resolver-handling)
> of the full chapter on this topic.

This sample differs from the one given for [`#request`](#request) in only one
line, which is commented upon below.

~~~
const Site = Model.build(
  attribute('article', class extends attribute.Reference {
    request() { return from('path').map(path => new ArticleRequest(path)); }
  }));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  $.getJSON(request.path)
    .done((data) => { result.set(types.result.success(Model.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

const app = new App();
app.resolvers.register(ArticleRequest, articleResolver);

const site = new Site({ path: '/api/attribute.json' });
site.attribute('article').resolveWith(app); // this is the key line
return site.get('article').map(article => article ? article.keys() : null);
~~~

