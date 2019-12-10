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
    this.reactTo(this.subject.get('name'), name => {
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

## Navigation

View Navigation provides a way to leverage the known tree and hierarchy of drawn
Views. Just as you can get the `.children` or `.parent` of a DOM node, and with
some knowledge of the structure of your own application make use of those relationships,
you can get the children or parents of a `.render`ed Janus View in a principled
way to do contextual work on them.

And just as tools like jQuery add selector semantics and shortcut tools like `.closest`
on top of this tree navigation, Janus allows selection of a sort.

Most of these methods take a `selector` parameter. If a value is given, Janus will
interpret that value as a selector, using semantics as follows, in order:

1. If `selector` is a `String` or `Number`, and the navigation operation moves
   toward the _leaves_ of the tree, then that value will be passed to `.get_` on
   the `.subject` of the View. If a non-nullish value is returned, it will be used
   as the selector for the following checks. Otherwise, `selector` is used as-is.
2. If `selector` is `undefined', there is no selection and everything is a valid
   match.
3. If `selector` is `===` to the navigation candidate View, it will match.
4. If `selector` is `===` to the `.subject` of the navigation candidate View,
   it will match.
5. If `selector` is an `instanceof` the navigation candidate View, it will match.
6. If `selector` is an `instanceof` the `.subject` of the navigation candidate View,
   it will match.

More explanation about View Navigation can be found [here](/theory/views-templates-mutators#view-navigation).

### #parent
#### .parent(selector: Selector?): Varying[View?]

Returns the parent of the View. If a [`selector`](#navigation) is given, `null`
will be returned unless the parent matches the `selector`.

Because the parent of a `.render`ed View never changes, the contained value of
the returned `Varying` will never change. Thus, it usually makes more sense to
call [`#parent_`](#parent_).

~~~ inspect-plain
const parents = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { parents.add(view.parent()); }),
    find('span').render(from('child'))
));
const stack = new Model({ name: 'one', child: new Model({ name: 'two' }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(parents) ];
~~~

### #parent_
#### .parent_(selector: Selector?): View?

Like [`#parent`](#parent), but returns the current value immediately. Because the
parent of a View never changes, it is probably more sensible to use this method
than `#parent`.

~~~ inspect-plain
const parents = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { parents.add(view.parent_()); }),
    find('span').render(from('child'))
));
const stack = new Model({ name: 'one', child: new Model({ name: 'two' }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(parents) ];
~~~

### #closest
#### .closest(selector: Selector?): Varying[View?]

Iterates up the stack of parents of the View, and returns the first that matches
the given [`selector`](#navigation). If no `selector` is given, this method is
equivalent to calling [`#parent`](#parent) with no `selector`.

Because the parents of a `.render`ed View never changes, the contained value of
the returned `Varying` will never change. Thus, it usually makes more sense to
call [`#closest_`](#closest_).

~~~ inspect-plain
const closests = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { closests.add(view.closest(Root)); }),
    find('span').render(from('child'))
));
class Root extends Model {}
const stack = new Root({ name: 'one',
  child: new Model({ name: 'two',
    child: new Model({ name: 'three' }) }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(closests) ];
~~~

### #closest_
#### .closest_(selector: Selector?): View?

Like [`#closest`](#closest), but returns the current value immediately. Because
the parents of a View never change, it is probably more sensible to use this method
than `#closest`.

~~~ inspect-plain
const closests = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { closests.add(view.closest_(Root)); }),
    find('span').render(from('child'))
));
class Root extends Model {}
const stack = new Root({ name: 'one',
  child: new Model({ name: 'two',
    child: new Model({ name: 'three' }) }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(closests) ];
~~~

### #into
#### .into(selector: Selector?): Varying[View?]

Returns the first immediate child of the View that matches the given [`selector`](#navigation).
The order that the `.render` children are checked is the order in which they are
declared in the `template`, but it is probably inadvisable to rely on this ordering,
as it can be difficult to reason about and will result in brittleness and sensitivity
in your code.

For this reason, it is recommended to only use `#into` if you are sure only one
child View will result. Usually, this means there is only one `.render`ed child,
or the given `selector` will only match one child.

Because `#into` navigates toward the leaves of the tree, the `selector` may be
a `String` or `Number` data key reference as [described above](#navigation).

~~~ inspect-plain
const children = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { children.add(view.into()); }),
    find('span').render(from('child'))
));
const stack = new Model({ name: 'one', child: new Model({ name: 'two' }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(children) ];
~~~

### #into_
#### .into_(selector: Selector?): View?

Like [`#into`](#into), but returns the current result immediately.

~~~ inspect-plain
const children = new List();
const StackView = DomView.build(
  $('<div><button/><span/></div>'),
  template(
    find('button')
      .text(from('name'))
      .on('click', (event, subject, view) => { children.add(view.into_()); }),
    find('span').render(from('child'))
));
const stack = new Model({ name: 'one', child: new Model({ name: 'two' }) });

const app = new App();
app.views.register(Model, StackView);
return [ app.view(stack), inspect.panel(children) ];
~~~

### #intoAll
#### .intoAll(selector: Selector): List[View]

Returns all immediate children of the View that match the given [`selector`](#navigation).
The order that the matching `.render` children appear in the returned List is the
order in which they are declared in the `template`, but it is probably inadvisable
to rely on this ordering, as it can be difficult to reason about and will result
in brittleness and sensitivity in your code.

A notable exception is when using the Janus Standard Library `ListView`, which
will always respect the order of the source `List`.

Because `#intoAll` navigates toward the leaves of the tree, the `selector` may be
a `String` or `Number` data key reference as [described above](#navigation).

~~~ inspect-plain
class Special extends Model {}
const children = new List();
const TreeView = DomView.build(
  $('<div><button class="main"/><button class="x">x</button><span/></div>'),
  template(
    find('button.main')
      .text(from('name'))
      .on('click', (event, subject, view) => {
        const listView = view.into_(List);
        if (listView == null) children.add('no children');
        else children.add(listView.intoAll(Special));
      }),
    find('button.x').on('click', (event, subject) => { subject.destroy(); }),
    find('span').render(from('children'))
));
const tree = new Model({ name: 'root', children: new List([
  new Special({ name: '1', children: new List([
    new Model({ name: '1a' }),
    new Special({ name: '1b' }),
    new Special({ name: '1c' })
  ]) }),
  new Model({ name: '2', children: new List([
    new Special({ name: '2a' })
  ]) })
]) });

const app = new App();
app.views.register(Model, TreeView);
stdlib.view($).registerWith(app.views);
return [ app.view(tree), inspect.panel(children) ];
~~~

### #intoAll_
#### .intoAll_(selector: Selector): Array[View]

Like [`#intoAll`](#intoAll), but returns the current result immediately, in the
form of an `Array`.

~~~ inspect-plain
class Special extends Model {}
const children = new List();
const TreeView = DomView.build(
  $('<div><button class="main"/><button class="x">x</button><span/></div>'),
  template(
    find('button.main')
      .text(from('name'))
      .on('click', (event, subject, view) => {
        const listView = view.into_(List);
        if (listView == null) children.add('no children');
        else children.add([ listView.intoAll_(Special) ]);
      }),
    find('button.x').on('click', (event, subject) => { subject.destroy(); }),
    find('span').render(from('children'))
));
const tree = new Model({ name: 'root', children: new List([
  new Special({ name: '1', children: new List([
    new Model({ name: '1a' }),
    new Special({ name: '1b' }),
    new Special({ name: '1c' })
  ]) }),
  new Model({ name: '2', children: new List([
    new Special({ name: '2a' })
  ]) })
]) });

const app = new App();
app.views.register(Model, TreeView);
stdlib.view($).registerWith(app.views);
return [ app.view(tree), inspect.panel(children) ];
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
  bind('greeting', from('subject').get('name').map(name => `Hello, ${name}!`))
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
    this.reactTo(this.subject.get('name'), name => {
      node.text(name);
    });
    return node;
  }
}

const model = new Model({ name: 'Alice' });
const view = new SampleView(model);
return view.artifact(); // calls _render
~~~

