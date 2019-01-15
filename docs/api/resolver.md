# Resolver

There is no `Resolver` class. Instead, a `Resolver` is any function with the signature
`Request -> Varying[types.result]?`. This is explained in detail in the [full chapter
on `Resolver` and its related classes](/theory/requests-resolvers-references).

Instead, the `Resolver` package contains a number of helpful functions and classes
(just [one class](#MemoryCache), technically) which are useful when constructing
`Resolver` systems for your application.

None of them will actually perform `Request` resolution for you: to avoid binding
Janus to particular dependencies, this is left for you to do. Regardless, you will
likely find the following tools helpful.

## Combining Resolvers

### λoneOf
#### Resolver: (Request -> Varying[types.result]?) => oneOf: (…resolvers: …Resolver) -> Resolver

The `oneOf` `Resolver` takes multiple `Resolver`s and tries them all in order
until one of them succeeds, whereupon its result is used. ([Recall](/theory/requests-resolvers-references)
that `Resolver`s may return `null` to indicate that they were unable to resolve
the `Request`).

It is possible to use `oneOf` to mux directly between a large list of all the
actual `Resolver` functions your application employs, but typically [`fromLibrary`](#fromLibrary)
is a better way to do that. Rather, the intention behind `oneOf` is to help build
multi-layer caching systems, where the inputs to `oneOf` are calls to the various
tools listed below on this page.

It's difficult to demonstrate this function by itself, so the following nonfunctional
sample just demonstrates its usage in context. The [`MemoryCache`](#MemoryCache)
example shows it in a more complex, working context.

~~~ noexec
class MyApp extends App {
  resolver() {
   return Resolver.oneOf(
      Resolver.fromDom($('#page-cache')),
      Resolver.fromLibrary(app.resolvers)
    );
  }
}
~~~

## Basic Resolvers

### λfromLibrary
#### Resolver: (Request -> Varying[types.result]?) => fromLibrary(library: Library): Resolver

Given a `library` mapping `Request` classtypes to `Resolver`s, returns a `Resolver`
which will take a `request`, consult the `library` to see which `Resolver` handles
the given `request`, and perform the resolution, returning the `Varying[types.result]`
result value.

If the `library` does not have a matching `Resolver` for the `request`, `null`
will be returned.

~~~
class SampleRequest extends Request {}
const sampleResolver = (sampleRequest) => new Varying(types.result.success(42));

const app = new App();
app.resolvers.register(SampleRequest, sampleResolver);

const libraryResolver = Resolver.fromLibrary(app.resolvers);
return libraryResolver(new SampleRequest());
~~~

### λfromDom
#### Resolver: (Request -> Varying[types.result]?) => fromDom(dom: DollarNode, deserialize: (String, DollarNode -> \*)?): Resolver

Given a `dom` node wrapped in a jQuery or equivalent interface, returns a `Resolver`
which returns data encoded into the `dom` node based on caching signatures.

In particular, given a structure like the following:

~~~ noexec
<div id="page-cache">
  <div id="da39a3ee5e6b4b0d3255bfef95601890afd80709">{"id":42,"name":"seattle"}</div>
  <div id="b858cb282617fb0956d960215c8e84d1ccf909c6">{"id":17,"name":"chicago"}</div>
</div>
~~~

And 'fetch'-type `Request` instances whose [`#signature`](/api/request#signature)
match the node `id`s, passing `$('#page-cache')` into `fromDom` will result in a
`Resolver` that searches for direct children of the given `id`, returning its text
contents if found and `null` if not.

In the case that a matching node is found, it is deleted from the page so that
future requests don't always match against it. You can cache its contents using
a caching layer like [`MemoryCache`](#MemoryCache) which gives you finer control
over cache management and expiry.

Optionally, a second parameter `deserialize` may be given. If so, it will be given
the `String` text contents of the caching node, and the `DollarNode` jQuery-ish
wrapped matching node itself. Whatever it returns will be used as the success
value (it will be wrapped in `types.result.success` for you).

~~~
const dom = $(`
  <div id="page-cache">
    <div id="city-42">{"id":42,"name":"seattle"}</div>
    <div id="city-17">{"id":17,"name":"chicago"}</div>
  </div>
`);

class City extends Model {};
class CityRequest extends Request {
  signature() { return `city-${this.options.id}`; }
}

const resolver = Resolver.fromDom(dom, (text => City.deserialize(JSON.parse(text))));
return [
  resolver(new CityRequest({ id: 1 })),
  resolver(new CityRequest({ id: 42 })),
  resolver(new CityRequest({ id: 17 })),
  resolver(new CityRequest({ id: 42 }))
];
~~~

## Caching

The Janus Resolver cache system is a loose interface and simple block of logic
which allows stateful caches to integrate cleanly with the purely functional Resolver
system at large. More information can be found in the [section about caching](/theory/requests-resolvers-references#caching-resolvers).

Any cache passed to `Resolver.caching` must conform to the `Cache` interface, which
consists of two methods:

* `#resolve(request: Request): Varying[types.result]?` asks the cache for a hit
  for the given `request`. If it has no such record, it may return `null`, whereupon
  the fallback Resolver will be used instead.
* `#cache(request: Request, result: Varying[types.result]): void` is called in
  the event that the cache missed but the fallback Resolver returned a result.
  In this case, the `Varying[types.result]` (which may not yet be `complete`)
  will be offered to the cache via this invocation.

For more detail on these two invocations in context of the broader Request lifecycle,
see the [`λcaching`](#λcaching) reference below.

### λcaching
#### Resolver: (Request -> Varying[types.result]?) => caching(cache: Cache, resolver: Resolver): Resolver

Given a `cache` that conforms to the `Cache` interface (see above), and a fallback
`resolver` to use when the `cache` misses, creates a new `Resolver` that attempts
to use the `cache` and then tries the given `resolver` if it fails.

This is explained in detail in [this chapter section](/theory/requests-resolvers-references#caching-resolvers),
but in brief `caching` works as follows:

* Given a `request`, it first tries the `cache` by calling `cache.resolve(request)`.
* If the cache returns a `Varying[types.result]`, then that value is immediately
  returned and no further work is performed.
* If the cache returns a `null`ish value, then the `resolver` is called with the
  `request`.
* If the resolver returns a `Varying[types.result]`, then that result is offered
  to the cache via `cache.cache(request, result)`. It is also then returned as
  the final result value.
* If the resolver returns a `null`ish value, nothing further happens.

> Typically, the given `resolver` will be something like `Resolver.oneOf` or
> `Resolver.fromLibrary` which embody a whole collection of `Resolvers`.

For an example of this function in use, please see the sample for [`MemoryCache`](#MemoryCache)
below.

### MemoryCache
#### new MemoryCache(): Cache

The `MemoryCache` is a drop-in caching layer that conforms to the `Cache` interface
(see the start of this section). Given `Request` instances which correctly implement
the various caching flags (notably `.type` and `#signature`, but `#expires` and `.cacheable`
are also respected), the `MemoryCache` will do all the necessary work to appropriately
cache and invalidate data at the appropriate times.

In particular, `MemoryCache` follows these rules:

* If a `Request` has no `#signature` implemented or returns a `null`ish value,
  it will be ignored entirely, and `null` will be returned.
* If the `Request` has a `.type` of `types.operation.fetch()`:
  * If it has in its cache a record for the request's `signature`, then the cached
    `Varying` will be returned.
  * If it does not, and the fallback resolver finds a result, that result will
    be cached by its signature.
* If the `Request` has a `.type` of `types.operation.delete()`:
  * The existing cache entry for the Request's `signature` is invalidated.
  * `null` is always returned.
* For all other `.type`s (`create`, `update`):
  * The existing cache entry for the Request's `signature` is invalidated.
  * `null` is always returned, so the fallback resolver is used.
  * If the fallback resolver produces a result (`Varying[types.result]`), and
    `Request` has `cacheable` set to `true`:
    * The `MemoryCache` will snoop on the `Varying`.
    * If it sees a value of `types.result.success`, it will cache the result by
      its signature.
    * If it sees a value of `types.result.complete` (both `success` and `failure`
      are considered `complete`), it stops watching the `Varying`.

The net effect of this is that `Request` `signature`s may describe _which_ resource
they refer to, and the `type` of the `Request` will ensure the correct behavior
relative to that resource.

For instance, say we have a `User` with an `id` of `42`. The related `Request`s
for the `User` (`FetchUser`, `CreateUser`, `UpdateUser`, `DeleteUser`) may all
return a common signature (say, `user-42`). Then the `MemoryCache` will behave
as follows for the following hypothetical request sequence:

* `FetchUser(42)`: cache miss; `user-42` is empty. gets the data from the remote
  resource via the fallback resolver; it sees `Varying[types.result]` and caches
  that `Varying` at `user-42`.
* `FetchUser(42)`: cache hit; the extant `Varying[types.result]` is returned.
* `UpdateUser(42)`: cache hit, it is cleared out and the fallback resolver is
  asked to perform the operation. Say we left `cacheable` at its default `true`
  value: the server response to the request, which by standard `REST` semantics
  ought to be the present state of the resource, is cached at `user-42`, but only
  upon a `types.result.success`ful response.
* `FetchUser(42)`: cache hit; the extant `Varying[types.result.success]` which
  was returned by the `UpdateUser` operation is returned.

> In fact, given the above-described rules, if you are working with a correctly
> structured RESTful service, you may simply use the request URL path as the
> `signature`. Because it uniquely describes the resource in question, it works
> perfectly for the caching signature.
>
> The one caveat is that if you wish to use `fromDom`, you'll have to replace
> the `/` characters with something else, as they are not valid DOM `id`s.

~~~
const cacheDom = $(`<div id="page-cache"/>`); // empty for our purposes

const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
  signature() { return this.path.replace(/\//g, '-'); }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  $.getJSON(`${request.path}.json`)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

// but this is different:
const resolvers = new Library();
resolvers.register(ArticleRequest, articleResolver);

class DocsApp extends App {
  resolver() {
    return Resolver.caching(
      new Resolver.MemoryCache(),
      Resolver.oneOf(
        Resolver.fromDom(cacheDom),
        Resolver.fromLibrary(resolvers)
      ));
  }
}

const app = new DocsApp();
const x = app.resolve(new ArticleRequest('/theory'));
const y = app.resolve(new ArticleRequest('/theory'));
const z = app.resolve(new ArticleRequest('/api/resolver'));

return [
  x, y, z,
  x === y,
  y === z
];
~~~

