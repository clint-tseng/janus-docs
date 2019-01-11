# Request

The `Request` class is a simple freeform data structure which contains information
describing some remote data resource. It doesn't do anything on its own, and its
usage is optional.

In typical usage, a `Request` class is created for each remote action (in REST
semantics, each verb+path pairing) so that the `App` `Library` can sense its type
and provide the appropriate `Resolver` function to fulfill the `Request`. More
information about this can be found in [the full article](/theory/requests-resolvers-references)
about `Request`s and its friends.

Because of this pattern of creating a subclass for each action, it is rare that
a `Request` would be directly instantiated. Rather, it is the specific subclass
for the resource you are requesting that you'd construct.

When subclassing `Request`, you should pay attention to the `type`, `signature`,
`cacheable`, and `expires` members, which help the built-in caching systems do
their work. Again, you can read the above-linked article for more information.

## Creation

### @constructor
#### new Request(options: Object): Request

Creates a new `Request` object. All `options` are automatically saved onto the
instance under `.options`.

~~~
const request = new Request({ userId: 42 });
return request.options;
~~~

## Cache Control

By default, the `Request` cache control settings do not cause any caching to
occur. In order to actually enable caching, you must implement `#signature`.
It is advisable, however, to understand and use all of the following controls
to ensure the behavior you intend.

### .type
#### .type: types.operation

This instance property must be one of the `types.operation` case class values:
`read`, `create`, `update`, or `delete`. These correspond with HTTP `GET`, `POST`,
`PUT`/`PATCH`, and `DELETE` cleanly. If you are using one of the default Janus
caching mechanisms ([`MemoryCache`](/api/resolver#MemoryCache), for example) then
it will take the operation type into account while caching (invalidating the cache
when a mutation operation is executed, for instance).

The default value is `types.operation.fetch`.

### #signature
#### .signature(): String?

The caching signature is a cache key used to determine if two different `Request`s
refer to the same operation. If it is not implemented or if it returns `null` or
`undefined` then the caching layer will ignore the request entirely. If you wish
to return a signature, it must be a `String`.

> Signatures are not automatically partitioned by `Request` classtype: they all
> live in a single namespace together.
>
> This is so that, for example, `fetch`/`GET` and `update`/`PATCH` requests can
> share a cache-key, and ergo the result returned by `PATCH`ing some particular
> resource may be used as the cached response for any subsequent `GET` request
> on the same resource.

All of the above-described behavior is _not_ inherent to `Request` or Janus. They
only apply when the standard Janus caching facilities are being used, and in
particular when [`MemoryCache`](/api/resolver#MemoryCache) is employed.

~~~
class ArticleRequest extends Request {
  signature() { return `article-fetch-${this.options.path}`; }
}
const request = new ArticleRequest({ path: '/api/request' });
return request.signature();
~~~

### .cacheable
#### .cacheable: Boolean

This instance property flag defaults to `true`. It only applies to mutating requests
([all `types.operation` types besides `fetch`](#type)). When it is set to `false`,
the response to the mutation request will not be cached.

This can be helpful if, for example, the server response to a `PATCH` response
is _not_ the full resource data (ie it does not match the `GET` response for the
same resource). In this case, you can set `cacheable` to `true`. In response, the
[`MemoryCache`](/api/resolver#MemoryCache) will:

* Still invalidate the cache for the given resource (so that future `GET` operations
  understand that the data should have changed and will actually request the data).
  This depends on the `#signature` matching between the two operations (see the
  boxed note for [`#signature`](#signature)).
* Refrain from caching the returned value from the eg `PATCH` request as the new
  data for the resource.

### #expires
#### .expires(): Number?

If implemented, this method may return the number of seconds for which the cached
resource should be valid. If anything but a number is given, no expiration will
be set and the cached resource will remain valid forever (or until a mutation operation
is run against it).

As with the above members, this behavior only applies when the standard Janus caching
facilities are being used, and in particular when [`MemoryCache`](/api/resolver#MemoryCache)
is employed.

