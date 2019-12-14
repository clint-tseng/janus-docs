# types

The `types` package contains a set of [case classes](case) used by Janus for various
common tasks, like referencing data or declaring operation results.

## Built-in Types

### .from
#### .from = { dynamic, get, attribute, varying, app, self, subject, vm }

* !RETURNS { cases }

The `types.from` cases are used to declaratively reference data needed for a computation.
They are used by [`from`](from), though you can replace them with your own using
[`from@build`](from#@build).

The default meaning of each type is documented under [`from#{x}`](from#{x}).

### .result
#### .result = { init, pending, progress, success, failure }
#### .result.complete >: { success, failure }

* !RETURNS { cases }

The `types.result` cases are used to communicate the overall result of an operation:
not done, done with success, or done with failure.

> `complete` is a virtual case superclass that will match `success` or `failure`.

The [`Reference` Attribute](attribute#reference-attribute) uses `types.result`
to determine whether to `.set` a `Request` result onto the `Model` or not. The
[caching Resolvers](resolver#caching) do something similar.

### .validity
#### .validity = { valid, warning, error }

* !RETURNS { cases }

The `types.validity` cases are used by [`Model`](model#model-validation) and its
[`validate`](model#λvalidate) schema declaration to determine the validity of
the Model.

In particular, they are used to determine the results of the [Model validation
methods](model#model-validation) like [`#errors`](model#errors) and [`#valid`](model#valid).

### .operation
#### .operation = { read, create, update, delete }
#### .operation.mutate >: { create, update, delete }

* !RETURNS { cases }

The `types.operation` cases are used by [`Request`](request) and the [`MemoryCache`
Resolver](resolver#MemoryCache) to help manage the cache state. Their particular
semantics are documented extensively under the `MemoryCache` documentation.

> The `mutate` virtual superclass will match any of `create`, `update`, or `delete`.

If you are not using the `MemoryCache`, there is no real reason to use these cases.

### .traversal
#### .traversal = { recurse, delegate, defer, varying, value, nothing }

* !RETURNS { cases }

The `types.traversal` cases are used to control the flow of [`Traversal`](traversal).

You can find information about them at the API documentation linked above. They
are also explained in more extensive detail in the [Traversal Further Reading](/further-reading/traversal)
chapter.

