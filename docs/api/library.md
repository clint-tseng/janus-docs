# Library

The Library is Janus's dependency injection solution. Because one of the goals
behind Janus is to enable true code-sharing across the server and client, it must
provide a robust solution for isolating the few differences that _must_ exist between
the different environments.

The Library (which is explained in detail [here](/theory/app-and-applications#the-library))
works by taking registrations: given this classtype, that is the resource that
handles it. Then, given various objects of various types, it can return the appropriate
resource. It handles things like subclasses and context-specific search criteria
as well.

In Janus, the Library is primarily used to store two types of resources: [`View`s](view)
against data objects, and [`Resolver`s](resolver) against [`Request`s](request).
The canonical Library for each of these scenarios lives on the [`App`](app).

## Creation

### @constructor
#### new Library(): Library

Creates a new empty `Library`.

~~~
return new Library();
~~~

## Catalog Management

### #register
#### .register(class: @Class, resource: \*): void
#### .register(class: @Class, resource: \*, options: Object): void

* !IMPURE

At minimum, `#register` takes a `class` whose instances should yield `resource`
when the Library is queried for a resource via [`#get`](#get). `class` _must_ be
a Class reference, but `resource` may be any non-null object.

If given, `options` provide additional key/value criteria which may be explicitly
searched for upon `#get` (ie [`render(…).criteria(…)`](dom-view#render) is
called). There are two (optional) `options` keys that are special:

* `context` is by convention the main Library search criteria. It is typically
  a `String`, and defaults to `"default"` if not provided. It has one unique property:
  if a search for the given `context` at `#get` time fails, the Library will try
  againt with `"default"` as the `context`.
* `priority` is a `Number` indicating the relative priority of otherwise equally-matching
  results. A higher value indicates higher priority. If no `priority` is given,
  a value of `0` is assumed. If two matches have the same `priority`, the first-registered
  resource wins.

Most of the native Javascript classtypes work as expected with the Library; `Number`,
`String`, `Boolean`, and others have explicit handling. It is also possible to
call `.register(null, …)`, in which case `null` and `undefined` values will yield
the registered resource.

Please see the following block documenting `#get` for a code sample, since `#register`
does nothing appreciable on its own.

### #get
#### .get(for: \*): \*?
#### .get(for: \*, criteria: Object): \*?

Given some object instance `for` which a resource is requested, returns the registered
resource for the object's classtype if it exists. If nothing is found, `null` is
returned.

~~~
const library = new Library();

// JS natives:
library.register(Number, '42 for you');
library.register(Boolean, 'yes or no?');

// class inheritance:
class A {}
class B extends A {}
class C extends B {}
library.register(A, 'a class');
library.register(C, 'c the class?');

return [
  library.get(14),
  library.get(false),
  library.get(new A()),
  library.get(new B()),
  library.get(new C())
];
~~~

If `criteria` is provided, a resource will only be returned if a resource was registered
that exactly matches all the given `criteria`. If the registration provided extra
criteria that are not part of the `#get` search criteria, those values are ignored
and the resource is returned anyway.

The `context` key within `criteria` is somewhat special: if you call `#get` with
a `criteria.context` value present and a match is found, nothing unusual happens.
But if no match is found, the Library will try your search again with a `context`
of `"default"`, and return that match if found.

~~~
const library = new Library();

// criteria:
library.register(Number, 'take a number', { tone: 'imperative' });
library.register(Number, 'here is your number', { tone: 'statement' });

// context:
library.register(Boolean, 'there is some truth to this', { context: 'observation' });
library.register(Boolean, 'a boolean');

return [
  library.get(20),
  library.get(40, { tone: 'statement' }),
  library.get(false),
  library.get(true, { context: 'observation' }),
  library.get(false, { context: 'grandiose' })
];
~~~

As noted in the documentation for [`#register`](#register) above, simultaneous
matches are tiebroken by `priority` value at time of registration (largest value
wins), followed by the order of registration (first registration wins).

~~~
const library = new Library();

library.register(Number, 'numerical');
library.register(Number, 'a number', { priority: 99 });

return library.get(21);
~~~

