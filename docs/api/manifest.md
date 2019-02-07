# Manifest

The `Manifest` is a workflow class that assists in tracking page rendering status
by monitoring an `App` instance it generates for rendering that page.

Its primary job is to monitor outstanding [`Request`](request) resolutions, and
report when all `Request`s are resolved with no new resolutions generated in response.
When this culmination occurs, `Manifest` checks the `Model` object that represents
the rendering page for any [validation `error`s](model#errors). The `Model`s validation
state determines the ultimate page-rendering result reported by `Manifest`.

In this sense, the `Manifest` could have been simply a function that takes an `App`
and returns its own `Varying[types.result]`. But `Manifest` also keeps track of
all the `Request`s and related results it saw, and offers them for on-page caching
and other homeworks, and so it is instead a full class.

`Manifest` is a subclass of `Base`, and all its working resources may be cleanly
disposed of by calling `.destroy()` on it.

For more information about `Manifest` and application page rendering, please see
[the theory chapter section](/theory/app-and-applications#manifest) about it.

## Creation

### @constructor
#### new Manifest(app: App, model: Model): Manifest
#### new Manifest(app: App, model: Model, criteria: Object?, options: Object?): Manifest

When a `Manifest` is constructed, it shadows the given `app` (so that events are
related only to this particular page rendering), it instantiates a `View` appropriate
for the given Page `Model` (as determined by [`App#view`](app#view)), and begins
watching for `Request` resolution events.

The additional arguments `criteria` and `options` are optional; if given, they
are simply passed along to [`App#view`](app#view) and thus behave as described
there.

### @run
#### Manifest.run(app: App, model: Model): Manifest
#### Manifest.run(app: App, model: Model, criteria: Object?, options: Object?): Manifest

An alternative syntax to the [`@constructor`](#@constructor), for those who dislike
`new` syntax.

## Render Status

### .result
#### .result: Varying[types.result]

The `result` property on `Manifest` indicates the current rendering status. It
may be `init()` while the `Manifest` is still being initialized, `pending()` while
`Request`s are outstanding, and then it will be either `success(View)` or
`error(List[types.validity.error])` depending on the page `Model` state when all
`Request`s are fully resolved to `success` or `failure`.

~~~
// just waits 3 seconds and parrots back the request `content`:
class SampleRequest extends Request {}
const sampleResolver = (request) => {
  const result = new Varying(types.result.pending());
  setTimeout((() => {
    result.set(types.result.success(request.options.content));
  }), 3000);
  return result;
};

const PageModel = Model.build(
  attribute('remote_resource', attribute.Reference.to(
    new SampleRequest({ content: new Model({ text: 'echo' }) })
  ))
);
const PageView = DomView.build(
  $('<div><h1>my cool page</h1><p/></div>'),
  template(
    find('p').text(from('remote_resource').get('text'))
  )
);

const app = new App();
app.resolvers.register(SampleRequest, sampleResolver);
app.views.register(PageModel, PageView);

const manifest = new Manifest(app, new PageModel());
return manifest.result;
~~~

### .requests
#### .requests: List[{ request: Request, result: Varying[types.result] }]

The `requests` property on `Manifest` is a `List` that keeps track of all the resolved
`Request`s the `Manifest` has seen. `Request`s are added to the `List` the moment
they are resolved, not when they complete or are successful.

This `List` may be useful for, among other things, on-page data caching, metrics,
error tracking, and other purposes.

~~~
class OtherRequest extends Request {}
// there is no resolver for this request type.

// parrots back the request `content` immediately:
class SampleRequest extends Request {}
const sampleResolver = (request) =>
  Varying.of(types.result.success(request.options.content));

const PageModel = Model.build(
  attribute('remoteThingA', attribute.Reference.to(
    new SampleRequest({ content: new Model({ text: 'alpha' }) })
  )),
  attribute('remoteThingB', attribute.Reference.to(
    new SampleRequest({ content: new Model({ text: 'bravo' }) })
  )),
  attribute('remoteThingC', attribute.Reference.to(
    new SampleRequest({ content: new Model({ text: 'charlie' }) })
  )),
  attribute('remoteThingD', attribute.Reference.to(
    new OtherRequest({ content: new Model({ text: 'delta' }) })
  ))
);
const PageView = DomView.build(
  $(`<div>
    <h1>my cool page</h1>
    <p class="one"/>
    <p class="two"/>
    <p class="three"/>
    <p class="four"/>
  </div>`),
  template(
    find('.one').text(from('remoteThingA').get('text')),
    find('.two').text(from('remoteThingB').get('text')),
    find('.four').text(from('remoteThingD').get('text'))
  )
);

const app = new App();
app.resolvers.register(SampleRequest, sampleResolver);
app.views.register(PageModel, PageView);

const manifest = new Manifest(app, new PageModel());
return manifest.requests;
~~~

### .view
#### .view: \*

No matter what the current status of the `Manifest` is, the property `view` will
always contain whatever [`App#view`](app#view) returned for the given `model`.
Typically, this will be an instance of `View`.

~~~
class PageModel extends Model {}
const PageView = DomView.build(
  $('<h1>my cool page</h1>'),
  template());

const app = new App();
app.views.register(PageModel, PageView);

const manifest = new Manifest(app, new PageModel());
return manifest.view;
~~~

### .model
#### .model: Model

The `.model` property always refers to the `model` that was given to the `Manifest`
at [construction time](#@constructor), in case your workflow loses track of that
reference.

