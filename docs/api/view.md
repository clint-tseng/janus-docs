# View

The `View` class is an abstract base class which defines the general lifecycle
of a Janus view, and the interface through which this lifecycle is managed. For
most web applications, the [`DomView`](/api/dom-view) class will be more immediately
useful.

However, for applications that fall outside the HTML-specific purview of `DomView`
(voice-driven APIs, for example), it may make more sense to use or extend `View`
rather than `DomView`.

## Creation

### @constructor
#### new View(subject: \*, options: Object): View

All `View`s have some particular, singular `subject` which they represent. This
subject is always taken as the first argument to the View constructor. The `subject`
is always saved off as an instance property, at `this.subject`.

If the `View` class has a `viewModelClass` class property declared, the behavior
is [slightly different](#@viewModelClass).

> The `options` hash is primarily for your own use. Janus itself does not make
> use of it, although many components of the [Janus Standard Library](/api/stdlib)
> do.

If an [`_initialize`](#_initialize) method exists on the `View` class, it will be
called as the final step of instantiation.

~~~
return new View(new Model());
~~~

## Rendering and Context

### #artifact
#### .artifact(): \*

* !IMPURE

The `#artifact` method is the primary interface of a `View`; it retrieves the
actual view artifact itself, whether that be an HTML fragment, or an XML payload,
a native system view component, or anything else.

Behind the scenes, `#artifact` calls [`#_render`](#render) to actually generate
this artifact.

Its only semantic is that because each `View` is meant to represent a single view
instance of a single subject, `#artifact` will always yield the same reference
no matter how many times it is called&mdash;the result of `#_render` is cached
and returned directly after the first call.

~~~
class SampleView extends View {
  _render() {
    const node = $('<div/>');
    this.reactTo(this.subject.watch('name'), name => {
      node.text(name);
    });
    return node;
  }
}

const model = new Model({ name: 'Alice' });
const view = new SampleView(model);
return [
  view.artifact(), // TODO: debug-render jquery fragments
  view.artifact() === view.artifact()
];
~~~

### #pointer
#### .pointer(): types.from -> Varying[\*]

The `#pointer` method is primarily for use by the `View` itself. It provides `from`-binding
expressions with context based on the View and its subject. Most of the cases use
the `subject` as the context, while `self` will point at the `View` instance itself.

~~~
const binding = from('name').map(name => `hello, ${name}!`);
const model = new Model({ name: 'Alice' });
const view = new View(model);

return binding.all.point(view.pointer());
~~~

## Extending View (Overrides)

As noted at the top of this page, most HTML-based web applications will want to
use `DomView` rather than `View`, and indeed will want to use `DomView.build` rather
than directly `extend` `DomView`.

However, in all other cases, `extend`ing `View` is the likely path. At minimum,
one will wish to override the `_render` method, as the default implementation is
empty.

### @viewModelClass
#### View.viewModelClass: @Model?

The optional `viewModelClass` class property changes the construction process for
the `View`. Instead of directly assigning the `subject` to itself, it will construct
a new instance of `viewModelClass`, passing it the following arguments:

~~~ noexec
new viewModelClass({ view: View, subject: \*, options: Object }, { app: App })
~~~

Where `view` is the view itself, and `subject` and `options` are the parameters
originally passed to the view constructor. `app` is the `App` instance that usually
exists at `options.app`.

The resulting `viewModelClass` instance is scheduled to be destroyed whenever the
parent `View` is destroyed.

~~~ inspect-panel
class SampleViewModel extends Model.build(
  bind('greeting', from('subject').watch('name').map(name => `Hello, ${name}!`))
) {};

class SampleView extends View {
  static get viewModelClass() { return SampleViewModel; }
}

const model = new Model({ name: 'Jane' });
const view = new SampleView(model);
return view.subject;
~~~

### #_render
#### ._render(): \*

* !IMPURE

This is the method that is called by [`#artifact`](#artifact) to actually produce
the view artifact for this view instance. In general, this method should both produce
the artifact object itself, as well as kick off whatever databinding and reaction
is required to keep that artifact up-to-date as the subject data changes.

> Keep in mind that `View` derives from `Base`, which gives it access to resource
> management convenience methods like [`#reactTo`](base#reactTo), [`#destroyWith`](base#destroyWith),
> and others.

As long as _something_ is returned by `_render`, it will only ever be called once,
as `#artifact` caches/memoizes the response given by `_render` and returns it directly
thereafter.

~~~
class SampleView extends View {
  _render() {
    const node = $('<div/>');
    this.reactTo(this.subject.watch('name'), name => {
      node.text(name);
    });
    return node;
  }
}

const model = new Model({ name: 'Alice' });
const view = new SampleView(model);
return view.artifact(); // calls _render
~~~

