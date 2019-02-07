# App

The `App` is the only semblance of global context that exists in Janus. It does
not actually live globally, it is carefully (and automatically) passed around to
where it is needed (mostly on the View layer).

It performs two primary functions:

1. It carries the View library, which contains all the Views in your application
   registered against their target subject classtypes, so that Janus knows which
   Views to render given the data it has.
2. It carries the Resolvers library, which contain all the [Resolvers](resolver)
   for all the [Requests](request) in your application, and the [`#resolver`](#resolver)
   method which defines the resolution process, so that Janus knows how to request
   and cache the data you need.

Almost everything that could be considered "magic" in Janus lives inside of `App`.
For a thorough account of `App` and its responsibilities, please see [its full
chapter](/theory/app-and-applications).

## Creation

`App` derives from `Model`, so in most respects it works exactly the same way.

### @constructor
#### new App(): App
#### new App(data: Object): App

As with [`Model@constructor`](model#@constructor), you can construct an `App` with
or without data. Apart from the data keys `views` and `resolvers`, which are used
to store the View and Resolver libraries respectively, Janus does not make use
of Model data at all, and you are free to manipulate the data however you wish.

Because `App` has something resembling global context, it can be a convenient place
to store application context like localization language, user authentication, and
other commonly-needed information.

~~~
return new App({ locale: { major: 'en', minor: 'US' } });
~~~

## Application Views

### .views
#### .views: Library

A convenience getter which is exactly equivalent to calling `app.get_('views')`.

~~~
const app = new App();
return app.views;
~~~

### #view
#### .view(subject: \*): View?
#### .view(subject: \*, criteria: Object, options: Object): View?

The `#view` method returns a new instance of a `View` appropriate for the given
`subject`, if one can be found. If `criteria` is given, it is passed along to the
underlying [Views Library](#views) as part of the search. If `options` is given,
it is passed along to the `View` constructor as the second parameter.

Behind the scenes, `App` does some additional work beyond what is listed above:

* It ensures that the `options` given to the `View` constructor has an `app` value
  of itself. If you given an explicit `options` and it already has an `app`, that
  value is used instead.
* It performs [manual and auto-resolution](/theory/app-and-applications#app-resolver-handling)
  on the `subject`, if it has the appropriate facilities to do so.
* It emits a `createdView` event upon itself, with the instantiated `View` as the
  only event parameter.

Typically, this method is called on your behalf, by the [`render`](dom-view#render)
mutator.

For more information about this process, we recommend reading [the theory chapter](/theory/app-and-applications)
that covers it in detail.

~~~
class SampleModel extends Model {}
const SampleView = DomView.build(
  $('<p/>'),
  find('p').text(from('message'))
);

const app = new App();
app.views.register(SampleModel, SampleView);

return app.view(new SampleModel({ message: 'hello!' }));
~~~

## Application Resolvers

### .resolvers
#### .resolvers: Library

A convenience getter which is exactly equivalent to calling `app.get_('resolvers')`.

~~~
const app = new App();
return app.resolvers;
~~~

### #resolve
#### .resolve(request: Request): Varying[types.result]?

Given a `request` instance, `App` consults [its resolver process](#resolver) to
attempt to resolve the `request` into a `Varying[types.result]` value. If it cannot
do so, a `null`ish value will be returned.

If a successful resolution occurs, a `resolvedRequest` event will be emitted on
the `App` instance, with `request, result` as the event arguments.

Typically, this method is called on your behalf, by [`Reference` attribute](attribute#reference-attribute).

The default implementation of `#resolver` is to consult the `App` Resolver library,
as demonstrated in the following sample.

~~~
const alwaysTheAnswer = (request) => Varying.of(types.result.success(42));
class SampleRequest extends Request {}

const app = new App();
app.resolvers.register(SampleRequest, alwaysTheAnswer);

return app.resolve(new SampleRequest());
~~~

## Extending App (Overrides)

The primary reason you will have for extending `App` will be to override the `#resolver`
method, in order to define your own resolver process.

### #resolver
#### Resolver: (Request -> Varying[types.result]?) => .resolver(): Resolver

The `#resolver` method is usually only ever called once, by `App` itself. It is
expected to return some `Resolver` function which encapsulates your desired `Request`
resolution process: in particular, resolution sources and result caching.

More detail can be found [in the chapter on this subject](/theory/requests-resolvers-references)
as well as on the [`Resolver`](resolver) API reference page.

The sample for the [`MemoryCache` resolver cache](resolver#MemoryCache) demonstrates
an override of the `#resolver` method in a relatively realistic context.

