# DomView

The `DomView` is a specialization of `View` which comes equipped to deal with
HTML fragment views. It provides tools for drawing fragments, reattaching to
already-drawn fragments, wiring up client events, and fetching the final HTML
markup, among other things.

In general, you will want to use the `withOptions` and `build` class methods to
define `DomView` classes, though you may also derive from it if you prefer.

A detailed account of `DomView` and its constituent tools can be found [in its
own chapter](/theory/views-templates-mutators).

## Building a DomView

To define your own `DomView`, you will at least wish to call `DomView.build`,
though in some cases you will also wish to call `DomView.withOptions` and/or directly
extend the result of `@build` in order to implement `_wireEvents`.

### @withOptions
#### DomView.withOptions({ viewModelClass: @Model?, resolve: [String]? }): @DomView

Two possible options may be given to `DomView.withOptions`, which returns a new
`DomView` class definition with those options applied:

* `viewModelClass` defines a [`@viewModelClass`](view#@viewModelClass) property.
* `resolve` defines a `resolve` property. If provided, it must be an array of
  `String` keys referring to [`Reference`](attribute#reference-attribute) attributes
  on the subject `Model` which ought to be specifically resolved in the event that
  `autoResolve` is set to `false`. More information [here](/theory/app-and-applications#app-resolver-handling).

Compare the following sample to the sample for [View@viewModelClass](view#@viewModelClass):

~~~ inspect-panel
class SampleViewModel extends Model.build(
  bind('greeting', from('subject').get('name').map(name => `Hello, ${name}!`))
) {};

const SampleView = DomView.withOptions({ viewModelClass: SampleViewModel });

const model = new Model({ name: 'Jane' });
const view = new SampleView(model);
return view.subject;
~~~

### @build
#### DomView.build(fragment: $Node, template: Template): @DomView

The `@build` class method is the primary interface for creating `DomView` class
definitions. It takes a `fragment` target HTML fragment, wrapped in a jQuery-like
interface, and a `template`, which defines how data should be bound to that fragment.

In general, the results of calling `find(…).operation(…)` (where `operation`
is any [mutator](#mutators)) or `template(…)` may be passed as the `template`.
The full signature for `Template`s may be found [in the chapter section about
them](/theory/views-templates-mutators#templates).

More information about `find` and `template` follows after this sample.

~~~
const SampleView = DomView.build(
  $('<div><div class="name"/><p/></div>'),
  template(
    find('.name').text(from('name')),
    find('p').text(from('description'))
  )
);

const model = new Model({
  name: 'DomView',
  description: `
    The DomView is a specialization of View which comes equipped to deal with
    HTML fragment views. It provides tools for drawing fragments, reattaching to
    already-drawn fragments, wiring up client events, and fetching the final HTML
    markup, among other things.`
});

return new SampleView(model);
~~~

### λfind
#### find(selector: String).{mutator}(…): Template

> Where `{mutator}` is one of the mutators packaged with the `find`. By default,
> this is the set documented [below](#mutators), but you may generate your own
> set using [`find.build`](#λfind.build).

A chaining function. First, it takes a `selector` which references which node(s)
within the view fragment are the targets for this databinding. Only nodes present
when the `DomView` class is defined will be selected; manually modifying the DOM
structure will not add to the selection, and will likely disrupt existing selections.

Once called with the `selector`, a plain object is returned which contains the
various mutator functions as described in the inset note just above. Calling one
of these will result in a `Template` which may be passed to `@build`[#@build] or
[`template(…)`](λtemplate).

The mutator section of `find` may chain, as you see in this sample:

~~~
const Link = DomView.build(
  $('<a/>'),
  find('a')
    .attr('href', from('url'))
    .text(from('name'))
);

const resource = new Model({ name: 'API Documentation', url: '/api' });
return new Link(resource);
~~~

### λfindλbuild
#### find.build({ String : Mutator }): find

Given a mapping of names to `Mutator`s, this method returns a new `find` function
which works exactly like the normal one, except with the mutators you have provided.

`Mutator`s are documented [later on this page](#mutators), and in their own theory
[chapter section](/theory/views-templates-mutators#mutators).

The default mutators are _not_ included by default, so if you wish to interleave
your custom mutators with the default, you'll need to do something like this:

~~~
const customfind = find.build(Object.assign({
  bolded: (data) => (dom, point, immediate = true) =>
    data.all.point(point).react(flag => {
      dom.css('font-weight', (flag === true) ? 'bold' : 'normal')
    })
}, mutators));

const SampleView = DomView.build(
  $('<div/>'),
  customfind('div')
    .text(from('name'))
    .bolded(from('important'))
);

const model = new Model({ name: 'Some Name', important: true });
return new SampleView(model);
~~~

### λtemplate
#### template(…Template): Template

The `template` function lets you group multiple `Template`s together into a single
`Template`, since [`DomView@build`](#@build) only takes a singular `Template`.

Essentially, `find(…).{mutator}(…)` expressions and other `template()` results
may all be given as parameters to `template()`.

More information about how `template` works and its various uses may be found in
[its own theory chapter section](/theory/views-templates-mutators#templates).

~~~
const WithTitle = template(
  find('h1 a')
    .text(from('title'))
    .attr('href', from('url'))
);

const ArticleView = DomView.build(
  $(`<div class="article">
    <h1><a/></h1>
    <p/>
  </div>`),
  template(
    WithTitle,
    find('p').text(from('body'))
  )
);

const article = new Model({
  title: 'Why Janus is Cool',
  url: '/',
  body: 'Because functional composition is pretty neat.'
});

return new ArticleView(article);
~~~

## Mutators

A `Mutator` is any function that follows the given signature:

~~~ noexec
(…\*) -> dom: $Node, point: (types.from -> Varying), immediate: Boolean? -> Observation
~~~

By nature of returning an `Observation`, `Mutators` are impure functions. Usually,
they are used in conjunction with [`template`](#λtemplate), [`find`](#λfind),
and [`DomView@build`](#@build) to define `DomView` classes. In these cases, the
impurity and related resource management are handled by the `DomView`.

You may implement your own `Mutator`s; a sample may be found under the documentation
for [`find.build`](#λfindλbuild) above. If you do so, keep in mind that `dom`
may refer to more than one node.

Otherwise, documentation for the standard Janus mutators follows. Below, all the
standard mutators are shown in usage with `find`, but they may also be independently
found under the `mutators` top-level Janus export.

### .attr
#### find(…).attr(prop: String, data: From[\*]): Template

The `attr` mutator sets the given `prop` attribute on the DOM node(s) to the given
`data` value, through whatever jQuery-like framework you are using. If you are
using jQuery, its documentation may be found [here](https://api.jquery.com/attr/).

Whenever the `data` value changes, it will be reapplied.

> As with jQuery `#attr`, you may instead wish to use [`.prop`](#prop).

~~~
const SampleView = DomView.build(
  $('<a>look, a link!</a>'),
  find('a')
    .attr('href', from('url'))
    .attr('title', from('name'))
);

const model = new Model({ name: 'cool link', url: '/' });
return new SampleView(model);
~~~

### .prop
#### find(…).prop(prop: String, data: From[\*]): Template

The `prop` mutator sets the given `prop` attribute on the DOM node(s) to the given
`data` value, through whatever jQuery-like framework you are using. If you are
using jQuery, its documentation may be found [here](https://api.jquery.com/prop/).

Whenever the `data` value changes, it will be reapplied.

~~~
const SampleView = DomView.build(
  $('<input type="text"/>'),
  find('input').prop('value', from('name'))
);

const model = new Model({ name: 'cool text' });
return new SampleView(model);
~~~

### .classed
#### find(…).classed(className: String, data: From[Boolean]): Template

The `classed` mutator ensures that if `data` is `=== true`, then the DOM node(s)
will have the HTML class `className` applied. If `data` is anything other than
`true`, it will _not_ have `className`.

~~~
const SampleView = DomView.build(
  $('<div>Some div</div>'),
  find('div').classed('isError', from('isError'))
);

const model = new Model({ isError: true });
return new SampleView(model);
~~~

~~~ styles
.isError { color: red; }
~~~

### .classGroup
#### find(…).classGroup(prefix: String, data: From[String]): Template

The `classGroup` mutator manages all HTML classes on the target DOM node(s) that
begin with the `prefix`. At all times, it ensures the only class that exists on
the target(s) that begins with the `prefix` ends with the current value of the
provided `data`.

~~~
const SampleView = DomView.build(
  $('<div>Some div</div>'),
  find('div').classGroup('divColor-', from('color'))
);

const model = new Model({ color: 'red' }); // try blue or green
return new SampleView(model);
~~~

~~~ styles
.divColor-red { color: red; }
.divColor-blue { color: blue; }
.divColor-green { color: green; }
~~~

### .css
#### find(…).css(property: String, data: From[String]): Template

The `css` mutator sets an inline style on the target DOM node(s). It will set the
CSS property `property` to the present value of the given `data` at all times.

~~~
const SampleView = DomView.build(
  $('<div>Some div</div>'),
  find('div').css('font-size', from('size'))
);

const model = new Model({ size: '25px' });
return new SampleView(model);
~~~

### .text
#### find(…).text(From[String]): Template

The `text` mutator sets the text of the target DOM node(s) to the `String` content
provided at all times.

Typically, and certainly when Janus is used with jQuery, this method will sanitize
all HTML input as it is being set. This includes HTML entities. If you wish to
set raw HTML, see the [`html`](#html) mutator just below.

~~~
const SampleView = DomView.build(
  $('<div/>'),
  find('div').text(from('name'))
);

const model = new Model({ name: '&ldquo;test name&rdquo;' });
return new SampleView(model);
~~~

### .html
#### find(…).html(From[String]): Template

The `html` mutator sets the `innerHTML` of the target DOM node(s) to the `String`
content provided at all times.

> **Be warned** that this mutator does _not_ sanitize user input for [XSS attacks](https://en.wikipedia.org/wiki/Cross-site_scripting)!

~~~
const SampleView = DomView.build(
  $('<div/>'),
  find('div').html(from('name'))
);

const model = new Model({
  name: 'this is <strong>some <em>&ldquo;html&rdquo;!</em></strong>'
});
return new SampleView(model);
~~~

### .render
#### find(…).render(From[\*]): Template

The `render` mutator is explained thoroughly in [its own theory chapter section](/theory/views-templates-mutators#child-views),
but in general it takes any value and attempts, through the application `App.views`
library, to render a child view under the given target DOM node. If the value changes,
a new View is generated to replace the old one.

Unlike the other mutators, `render` sub-chains for additional configuration:

* `.render(…).context(cxt: String|From[String])` will use the given `cxt` as
  the [Library context](/theory/app-and-applications#the-library) when requesting
  a View class from the `app.views` [`Library`](library).
* `.render(…).criteria(obj: Object|From[Object])` will use the given `criteria`
  as the Library criteria (one of which may be `context`) when requesting a View
  class from the `app.views` Library (see the above links for more detail).
* `.render(…).options(opts: Object|From[Object])` will provide the given `opts`
  to the instantiated child `View` constructor as the second `options` argument.
  If `opts` changes, the View will be recycled for a new one so that the new constructor
  argument may be applied.

These subchains may chain together, and you can seamlessly chain back up to the
`find(…)` selection:

~~~
const SampleParentView = DomView.build(
  $('<div/>'),
  find('div')
    .render(from('subobject'))
      .context('summary')
      .criteria(from('subobject').get('type').map(type => ({ type })))
    .classed('hasChild', from('subobject').map(x => (x != null)))
);

class ChildModel extends Model {}

const BoldChildView = DomView.build(
  $('<div class="boldChild"/>'),
  find('div').text(from('name'))
);

const ItalicChildView = DomView.build(
  $('<div class="italicChild"/>'),
  find('div').text(from('name'))
);

const app = new App();
app.views.register(ChildModel, BoldChildView, { context: 'summary', type: 'bold' });
app.views.register(ChildModel, ItalicChildView, { context: 'summary', type: 'italic' });

const model = new Model({
  subobject: new ChildModel({ name: 'a child', type: 'bold' })
});
return new SampleParentView(model, { app });
~~~

~~~ styles
.boldChild { font-weight: bold; }
.italicChild { font-style: italic; }
~~~

### .on
#### find(…).on(event: String, handler: Handler): Template
#### find(…).on(event: String, selector: String, handler: Handler): Template

The `on` mutator attaches a client-side event to the target DOM node(s). When
the `DomView` it is attached to performs a [`#wireEvents`](#wireEvents) action,
all the event handlers created with `on` are activated and wired onto their respective
targets.

> As a result of this special "time of activation," as it were, the `on` mutator
> is a little bit special and only works when used in conjunction with `DomView`.
> Invoking it directly, for example, will not yield the expected result.

The `event` name is passed directly to the jQuery-like framework you are using,
and will have whatever properties and features that framework provides. If provided,
the `selector` filter is similarly passed along, and will filter the event according
to its target.

The `Handler` given in the signatures above are an augmented version of the usual
`event -> void` function:

~~~ noexec
Handler: (event: Event, subject: \*, view: DomView, artifact: $Node) -> void
~~~

Where `event` is the `Event` object you would normally receive, `subject` is the
View subject, `view` is a reference to the containing `DomView` instance, and
`artifact` is that `DomView`'s [`artifact`](#artifact).

~~~
const SampleView = DomView.build(
  $('<a/>').attr('href', '#'),
  find('a')
    .text(from('count').map(x => `clicked ${x} times`))
    .on('click', (event, subject) => {
      event.preventDefault();
      subject.set('count', subject.get_('count') + 1);
    })
);

const model = new Model({ count: 0 });
const view = new SampleView(model);
view.wireEvents(); // try commenting this line out.
return view;
~~~

## Rendering and Events

### #artifact
#### .artifact(): $Node

Returns a copy of the template fragment of this `DomView`, databound against its
`subject`. Only one copy will ever be returned; subsequent calls just return the
same fragment again.

Calling this method alone will _not_ wire client-side events. To do that, call
[`#wireEvents`](#wireEvents) as well.

As with the parent [`View#artifact`](view#artifact), this method calls out to
[`#_render`](#_render) to actually perform the rendering. Unlike the `View#artifact`,
`DomView` has a (very short) implementation that you would not likely wish to
override.

> **See also**: [`#attach`](#attach), just below.

~~~
const SampleView = DomView.build(
  $('<p>hello, this is a <em>test fragment</em></p>'),
  template()
);

const model = new Model();
const view = new SampleView(model);
return view.artifact();
~~~

### #attach
#### .attach(node: $Node): $Node

* !IMPURE

Like [`#artifact`](#artifact), `#attach` walks through a fragment and sets up
databinding against it, forever remembering that fragment as its artifact.

Unlike `#artifact`, `#attach` takes an existing `node` which was previously rendered
by the same `DomView` class, and binds against it, making the assumption that it
is already fully up-to-date with its given `subject` data, and therefore not mutating
any data into the fragment until the _next_ time the data changes. (In other words,
[`Varying#react`](varying#react) is called with `immediate` set to `false`.)

> For more information about this capability, please see [this chapter section](/theory/views-templates-mutators#attaching-to-rendered-views).
> And if you implement your own custom `View` or `DomView` that performs its own
> rendering, take care to implement `#_attach` in addition to `#_render` if you
> intend to use `#attach`.

`#attach` allows you to render a fragment in one execution context (say, on your
webserver) and pick the fragment (and all its subfragments) back up at near-zero
cost and without rerendering or recycling the entire DOM tree.

~~~
const SampleView = DomView.build(
  $(`<div><h1/><p/></div>`),
  template(
    find('h1').text(from('name')),
    find('p').text(from('body'))));

const model = new Model({ name: 'DomView', body: 'is pretty cool' });
const firstView = new SampleView(model);
const markup = firstView.markup(); // markup is a string!

const secondView = new SampleView(model);
secondView.attach($(markup));
model.set('body', 'is really cool');
return secondView;
~~~

### #wireEvents
#### .wireEvents(): void

* !IMPURE

When called, `#wireEvents` sets up client-side events for the `DomView`. If `#wireEvents`
has already been called, nothing happens. Otherwise, the following five things
occur:

1. `#artifact` is called to ensure a target fragment to actually attach events to.
2. For your future convenience, if your jQuery-like wrapper supports [`#data`](https://api.jquery.com/data/),
   then the `DomView` instance will be attached as data on its root DOM node(s)
   under the key `view`.
3. The user-overridable method `_wireEvents` is called.
4. Any [`on`](#on) mutators present on the `DomView` are activated.
5. `#wireEvents` is called on all child views, and any future child views `render`ed
   into this `DomView` subtree will have `#wireEvents` automatically called.

Because client-side events are not applicable during server-side rendering, the
goal behind the `#wireEvents` system is to avoid this event-wiring overhead when
processing pages on the server. If your application is set up as a tree with a
single application root node, you can just call `.wireEvents()` on that root view
upon startup, and never worry about event wiring again.

Please see the sample listing for the [`on` mutator](#on) to see that technique
in use. Here, we demonstrate the use of `#_wireEvents` instead. As implied by the
ordered list above, the two may be used in conjuction.

~~~
class SampleView extends DomView.build(
  $(`<div class="collapsableSection"><h1/><p/></div>`),
  template(
    find('div').classed('collapsed', from('collapsed')),
    find('h1').text(from('name')),
    find('p').text(from('body')))
) {
  _wireEvents() {
    const artifact = this.artifact();
    artifact.on('click', () => {
      this.subject.set('collapsed', !this.subject.get_('collapsed'));
    });
  }
}

const model = new Model({ name: 'DomView', body: 'is pretty cool' });
const view = new SampleView(model);
view.wireEvents();
return view;
~~~

~~~ styles
.collapsableSection.collapsed p { display: none; }
~~~

## Extending DomView (Overrides)

Generally, [`DomView@build`](#@build) should cover all but the most extreme needs.
Most overrides of `DomView` will only involve [providing a `#_wireEvents` method](#wireEvents).

However, in rendering complex visualizations and other performance-heavy situations,
it may be helpful to augment the default `_render` method (in which case it is
advisable to also pay attention to `_attach`. Even in these cases, the best practice
is to still use `DomView@build` for everything you can.

### #_wireEvents
#### ._wireEvents(): void

Please see [`#wireEvents`](#wireEvents).

### #_render
#### ._render(): $Node

This method is called by `DomView` when it is asked to furnish a view artifact.
Some additional details may be found at [`#artifact`](#artifact), and in [the theory
chapter section](/theory/views-templates-mutators#custom-view-render) about implementing
custom rendering.

> It is relevant to note that since `DomView` derives from `Base`, any databinding
> operations may be done via [`#reactTo`](base#reactTo), [`#destroyWith`](base#destroyWith),
> or implementing [`#_destroy`](base#_destroy).

Sample code can be found in the relevant theory chapter linked above.

### #_attach
#### .attach(): void

This method is called by `DomView` when it is asked to attach to an existing DOM
fragment via [`#attach`](#attach). You only need to override it if you have also
overridden [`#_render`](#_render).

More information and sample code may be found in the [further reading chapter](/further-reading/attach)
about `attach()`ing responsibly.

