Maps and Models
===============

We've already seen quite a lot of `Map`s and `Model`s in our examples so far.
They haven't gotten much explanation, because we've assumed that the notion of
a key/value data structure and some notion of continually watching what exists
at some key over time are sensible enough without much explanation.

And, we're not going to beat that point any further here. Instead, we are going
to explore some (but not all) of the more powerful data transformations you can
perform with Maps, and what Models add to the picture.

In Janus, a Model is just a fancy Map. Where Maps are key/value stores and carry
all the functionality associated with that data structure, including the useful
transformations you might need to perform on it, Models `extend` Map to add
application-specific behavior like data types, serialization, validation, and
more.

In particular, here is what we're going to cover for Maps:

* Basic key/value operations like `get`, `set`, and `watch`.
* Shadow-copied Maps, allowing data to be layered together.
* Enumeration and mapping.

And on top of this, Models offer these areas that we will explore:

* Databound keys.
* Named attributes with customizable behavior.
  * Default values and (de)serialization are some of these behaviors.
  * We will also cover some more-special cases like Enum attributes.
* Validation.

While we will briefly touch on serialization as a part of this chapter, a full
survey and understanding can be found in the Further Reading chapter on [Traversals](/further-reading/traversal),
upon which serialization is actually implemented and in which can be found its
full power.

Likewise, we will not be covering the Reference attribute in depth here, which
allows Model keys to reference some (remote, typically networked) absent resource
that should be fetched when the key is observed. We will get into Reference and
its friends in the [next chapter](/theory/requests-resolvers-references).

Maps
====

You've already seen Maps used a lot, but we've tried to limit even the basic
operations to some simple forms to avoid confusion. So let's start over and review
the basics, complete with alternate invocations.

~~~
const data = new Map({ id: 42, initial: 'values', go: 'here' });
data.set('but', 'more');
data.set('can', { be: { provided: 'later' } });
data.set('can.be.set', 'deeply');
data.set({ or: 'without', a: 'key' });

const setter = data.set('currying');
setter('is supported!');

const v = Varying.of(42);
v.react(data.set('convenient'));
v.set('it can be');

data.set('oops', 'do not set nullish values to clear keys');
data.unset('oops'); // instead, use .unset()

return inspect.panel(data);
~~~

Once set, `.get` and `.watch` can be used to fetch or watch keys.

~~~
const data = new Map({ id: 42, nested: { value: 'here' } });
return [
  data.get('id'),
  data.get('nested'),
  data.get('nested.value'),
  data.watch('id'),
  data.watch('nested'),
  data.watch('nested.value')
].map(inspect);
~~~

Simple enough; you can even get an entire subobject at once if you want. But there
are some things to watch out for if you do this, and it's generally a good idea
to only get individual values at a time if you can help it.

> # Warnings
> To expand on that, think about what it means to `.watch('nested')` here. Recall
> that Varying will not react unless the value _actually changes_, and that comparison
> is done with `===`. So unless the actual substructure object itself is replaced
> with another one (eg the reference changes), `.watch`ing it isn't likely to be
> very useful.
>
> In addition, when you `.get('nested')`, be very careful not to modify the structure
> you get back, since it's the actual object the Map is using to maintain its own
> structure. If you mess with it, the Map will get out of sync with itself.

So that's all the basic stuff. Next, let's talk about shadow-copies.

Shadow-Copied Maps
------------------

Calling `.shadow()` on a Map will give you a new Map that inherits its data from
the original: changes to the original (the shadow parent) will show up in the shadow
copy, but the shadow can accept its own data, which will locally override that
of the parent.

Here's an example:

~~~
const data = new Map({ name: 'Gadget', age: 8, owner: 'Jane' });
const shadow = data.shadow();

data.set('name', 'Gadget!');
shadow.set('age', 9);
shadow.set('color', 'black and white');
shadow.unset('owner');

return [ data, shadow ].map(inspect.panel);
~~~

So a shadow can override or unset present parent values, or create new values
where the parent doesn't have any. Any untouched values will carry through to the
shadow.

Many interesting applications are possible, but shadows are most commonly useful
when you have some data you've loaded from the server, and the user enters some
sort of edit view for it. Then, you can create a shadow copy of the canonical data
that you hand to the edit view, and should the user abort the edit operation you
still have the original laying around.

In that case, your application would typically either serialize the edited shadow
to the server, whereupon you'd get new canonical data back that you can use instead
of the original set, or if the user aborts you can simply discard the shadow. For
that and other use cases, a handful of other methods are available:

~~~
const data = new Map({ name: 'Gadget', age: 8, owner: 'Jane' });
const shadow = data.with({ owner: 'Lindsay' });

shadow.set('name', 'Gadget!');
shadow.revert('owner');

return shadow.watchModified();
~~~

The `.with({ … })` shortcut just makes a shadow and then immediately `.set`s
the given data, which can be useful in single-expression mapping lambdas. `.original()`
will always get you the root Map in a shadow chain; if you call it on an original
rather than a shadow it'll give itself back.

`.revert(key)` will undo a shadow override at a given location (unlike `.unset(key)`,
which explicitly overrides a location with empty data).

Lastly, the `.watchModified()` operation tells you whether the Map has changed
compared with its original. It's actually just a shortcut to `shadow.watchDiff(shadow.original())`,
which compares any two collections, and actually does so quite intelligently;
consider this sample, for instance:

~~~
const a = new Map({ name: 'Gadget', age: 8, owner: new Map({ name: 'Jane' }) });
const b = new Map({ name: 'Gadget', age: 8, owner: new Map({ name: 'Jane' }) });
return a.watchDiff(b);
~~~

It understands that they are the same despite the nested Maps that are different
instances. Like serialization, this is all accomplished through [Traversals](/further-reading/traversal),
which give you enormous flexibility and customizability over the process. You
can, for instance, override the diffing algorithm to ignore or apply special logic
to particular keys, for instance. Take a look at the linked chapter for more
information.

Enumeration
-----------

Like most Maps, you can get a List of the keys a Janus Map contains. Like most
structures in Janus, this List is kept up to date as the Map changes.

~~~
const data = new Map({ name: 'Gadget', age: 8, owner: { name: 'Jane' } });

const keys = data.enumeration();
const pairs = keys.flatMap(key => data.watch(key)
  .map(value => `${key}: ${value}`));

data.set('owner.age', 27);

return pairs;
~~~

You can imagine that this sort of thing might be useful when you don't know in
advance what exactly a Map schema might look like, for instance if there are
user-defined custom properties in it.

> You can use `.enumerate()` to get a static array of keys instead. If you don't
> like these names, you can use `.watchKeys()` and `.keys()` instead, respectively.

It can also be very useful when you need a list of some things, for instance to
render all of them on the page, but you also need to be able to rapidly look one
up by some identifier. You can formulate the data as a Map fundamentally, but get
an enumeration when you need a List.

~~~
const people = new Map({
  alice: new Map({ name: 'Alice Wonderlonious', bff: 'bob' }),
  bob: new Map({ name: 'Bob Cat', bff: 'alice' }),
  chelsea: new Map({ name: 'Chelsea Neuyok', bff: 'david' }),
  david: new Map({ name: 'David Pelapi', bff: 'chelsea' })
});

const PersonView = DomView.build(
  $('<div><span class="name"/> (BFF: <span class="bff"/>)</div>'),
  template(
    find('.name').text(from('name')),
    find('.bff').text(from('bff').flatMap(bff =>
      people.watch(bff).flatMap(person => person.watch('name'))))));

return people.enumeration().mapPairs((_, person) => new PersonView(person));
~~~

Here, we need to be able to look up a person's full name from some identifier in
order to display their BFF, so storing them by key/value pairs makes sense. But
we also want to render all of the people we know about, so we get an `.enumeration()`
of that Map.

> # Aside
> You may have noticed that we cheated a little bit in this example, and we
> directly reference `people` as a closure scope variable from the template. There
> are some ways around this, usually based around View Models or simply copying
> parent references to child data, but this is actually an open, unsolved problem
> in Janus at time of writing: how do we offer this kind of context in a sane,
> safe way?

This time around, rather than all the homework of `.enumeration().flatMap(key => data.watch(key).map(value =>  …))`
we use `.enumeration().mapPairs((key, value) => …)`, which is a convenience
shortcut offered by the Enumeration List. This is different from calling `.mapPairs`
directly on Map, which you'll be seeing in the following section: calling `.enumeration`
first gets you a List, and so when you chain `.mapPairs` onto that you'll get another
List, which is what we want here. Calling `.mapPairs` directly on Map maps the Map
over to another Map.

Mapping
-------

Yes, you can also map Maps. The resulting Map will have exactly the same key
structure, but will have values mapped by your given function.

~~~
const balances = new Map({ alice: 23.16, bob: 10.74, chelsea: 29.93 });
const doubled = balances.mapPairs((key, value) => value * 2);
return inspect.panel(doubled);
~~~

This mapped Map will stay up-to-date with its original whenever the original changes:
additions, changes, and removals to data on the original will result in changes
to the mapped Map. But as usual, you can use `flatMapPairs` instead of `mapPairs`
if your mapping also needs to change in response to some other input and so it
might return a Varying. That's the case in this innocent little scheme. (Nobody
will notice, don't worry.)

~~~
const balances = new Map({ alice: 23.16, bob: 10.74, chelsea: 29.93 });
const adjusted = balances.flatMapPairs((key, value) => (key === 'chelsea')
  // for chelsea, add 5 cents for every other account in the system.
  ? balances.watchLength().map((numAccounts) => value + (0.05 * (numAccounts - 1)))

  // otherwise, deduct 5 cents.
  : value - 0.05);

// alice makes a deposit..
balances.set('alice', balances.get('alice') + 5);

return inspect.panel(adjusted);
~~~

Remember, this is Javascript so we're pretty loose and flexible about exact types.
You can return static values to a `flatMap` and it'll just go along with it. We
take advantage of this above to avoid all the work of counting the number of accounts
unless it actually matters.

Models
======

Now that we have our fundamental key/value data structure and a toolbox of tricks
for transforming it, we can talk about Models. Models add three primary areas of
concern to Maps:

* Databound keys
* Custom attribute behavior at particular keys
* Validation

You are free to use none or all of these facilities as best suits your purpose.
You can always also define your own methods, for instance to codify particular
data operations for use by other areas of your application.

We'll start by covering the simplest, and the most familiar of the three above.

Model Bindings
--------------

Any Model key can be bound to some calculation based on other values available
to that model. Here is a simple example: our Model contains a reference to some
nested Model, but what our server wants to see is actually the foreign key reference
to that subentity, not the full data. The syntax to accomplish this should look
extremely familiar if you recall the chapter on [Views](/theory/views-templates-mutators).

~~~
const SubEntity = Model.build();
const Entity = Model.build(
  bind('subentity_id', from('subentity').watch('id'))
);

const entity = new Entity({ subentity: new SubEntity({ id: 42 }) });
// entity.unset('subentity'); // uncomment to clear the subentity out
return inspect.panel(entity);
~~~

Of course, we still need to _omit_ sending the full subentity to the server, but
that will be easy once we cover `attribute`s next.

As you can see, `bind` works a lot like `find` did in templates earlier, and the
Model itself is used as the context for the data references. These bindings can
be cascaded to make complex series of operations more palatable. This example is
quite long but it demonstrates some important points that are worth diving into,
so give the sample result a try (drag your mouse around on it), study the code
for a moment, and we'll chat about it afterwards.

~~~
const { floor, ceil, min, max } = Math;
const px = (x => `${x}px`);
const makeTicks = (count => (new Array(count + 1)).fill().map((_, idx) => idx));

// Segmented Axis:
class SegmentedAxis extends Model.build(
  // expects: width: px of draw area, ticks.count: count,
  // mouse.clicking: bool, mouse.now: x px

  bind('mouse.min', from('mouse.down').and('mouse.now').all.map(min)),
  bind('mouse.max', from('mouse.down').and('mouse.now').all.map(max)),

  bind('segment.width', from('width').and('ticks.count').all.map((w, t) => w / t)),

  bind('selection.left', from('mouse.min').and('segment.width')
    .all.map((x, w) => floor(x / w) * w)),
  bind('selection.right', from('mouse.max').and('segment.width')
    .all.map((x, w) => ceil(x / w) * w)),

  bind('ticks.idxs', from('ticks.count').map(makeTicks)),
  bind('ticks.objs', from('ticks.idxs').and.self().all.map((idxs, axis) =>
    new List(idxs).map(index => new Tick({ index, axis }))))
) {
  _initialize() {
    this.reactTo(this.watch('mouse.clicking'), clicking => {
      if (clicking === true) this.set('mouse.down', this.get('mouse.now'));
    });
  }
}

class SegmentedAxisView extends DomView.build(
  $('<div class="axis"><div class="selection"/><div class="ticks"/></div>'),
  template(
    find('.selection')
      .classed('hide', from('mouse.clicking').map(x => !x))
      .css('left', from('selection.left').map(px))
      .css('width', from('selection.right').and('selection.left')
        .all.map((right, left) => px(right - left))),

    find('.ticks').render(from('ticks.objs')),

    find('.axis')
      .on('mousedown', (_, subject) => {
        subject.set('mouse.clicking', true); })
      .on('mousemove', (event, subject) => {
        subject.set('mouse.now', event.offsetX); })
      .on('mouseup', (_, subject) => {
        subject.set('mouse.clicking', false); })
)) {
  _wireEvents() {
    const dom = this.artifact();
    this.reactTo(
      // a handy utility provided by the stdlib to form a Varying from events:
      stdlib.varying.fromEvent($(window), 'resize', (() => dom.width()), true),
      this.subject.set('width'));
  }
}

// Tick marks:
const Tick = Model.build(
  bind('left', from('index').and('axis').watch('segment.width')
    .all.map((idx, segWidth) => idx * segWidth)));

const TickView = DomView.build($('<div class="tick"/>'), find('.tick')
  .text(from('index'))
  .css('left', from('left').map(px)));

// Final assembly:
const app = new App();
stdlib.view.registerWith(app.get('views'));
app.get('views').register(SegmentedAxis, SegmentedAxisView);
app.get('views').register(Tick, TickView);

const axis = new SegmentedAxis({ ticks: { count: 10 } });
return app.view(axis);
~~~
~~~ styles
.axis {
  height: 200px;
  margin-bottom: 15px;
  position: relative;
}
.axis .selection {
  background: rgba(200, 200, 200, 0.3);
  bottom: 0;
  box-shadow: 0 0 0 1px rgba(200, 200, 200, 0.7) inset;
  pointer-events: none;
  position: absolute;
  top: 0;
}
.axis .ticks {
  border-top: 1px solid #000;
  left: 0;
  position: absolute;
  right: 0;
  top: 100%;
}
.axis .ticks .tick {
  line-height: 20px;
  margin-left: -10px;
  position: absolute;
  text-align: center;
  width: 20px;
}
.axis .ticks .tick:before {
  border-left: 1px solid #000;
  content: '';
  display: block;
  height: 4px;
  left: 50%;
  position: absolute;
}
.axis li:first-child .tick {
  margin-left: 0;
  text-align: left;
}
.axis li:first-child .tick:before {
  left: 0;
}
.axis li:last-child .tick {
  margin-left: -20px;
  text-align: right;
}
.axis li:last-child .tick:before {
  left: auto;
  right: 0;
}
~~~

If you think about how you might have otherwise built this interaction, it actually
becomes quite complex. There are a lot of different values that enter this system
at different times, and trying to update only what's needed piecemeal leads to
really complex subdivisions of code, while recomputing absolutely everything every
time is expensive.

Instead, with this approach we have some essential facts that we feed to the Model
one direct binding at a time, and we let all the computation fall out of it. This
insistence on minimizing the number of truth variables and how each is sourced can
be seen by the way we manage `mouse.down`: rather than just set it as part of our
`mousedown` event handler, we have the Axis Model instead enforce itself that when
`clicking` becomes true, we copy `mouse.now` to `mouse.down` at that moment.

The more concise and direct we are with core truth and how it is set, the more of
our system we push into our purely-functional, always-correct land, and the fewer
complications we introduce into our application.

> We have the Model do this point-in-time copy by implementing its `_initialize`
> method, which is called just after the initial data has been injected into the
> Model and databinding has begun. We use `this.reactTo` rather than just calling
> `this.watch('mouse.clicking').react(…)` for purposes of [resource management](/theory/resource-management).
>
> You see the same `.reactTo` method called in the `_wireEvents` body, for the
> same reason.

The intermediate variables, then, each encapsulate some useful derived fact from
that base truth, each of which is recomputed and updated only when it must be.
Each fact is small, purely functional, and relatively easy to glance and verify.
Line ordering is no longer a stylistic nor correctness concern: we only have to
convince ourselves that each mapping function is correct, rather than having to
worry about the ordering or invocation states of the whole assembly. There is some
concept of computational order encoded in each `from` binding, but as a whole our
set of `bind` statements are coequal facts, not sequential operations. They can
be organized at will.

And perhaps most importantly, we can see here how Models can represent data objects,
yes, but they can also be used as _problem-solving spaces_, where related computations
are performed in a locally shared scope and the results can be picked up by other
parts of your application, like Views.

Binding, then, is very powerful indeed.

Model Attributes
----------------

But if we turn our attention back to pure data modelling for a moment, we are still
missing some concept of an actual data schema. How, for example, do we know which
data editors to render for which attributes, or which Model classes to inflate
to when deserializing nested JSON data?

This is what `attribute`s are for, which are declared in `Model.build` much like
`bind`:

~~~
class Person extends Model {}

const Dog = Model.build(
  attribute('status', class extends attribute.Enum {
    default() { return 'available'; }
    values() { return [ 'adopted', 'pending', 'available' ]; }
  }),

  attribute('owner', class extends attribute.Model {
    static get modelClass() { return Person; }
  })
);

return [
  new Dog({ name: 'Gadget' }),
  Dog.deserialize({ name: 'Spot', status: 'adopted', owner: { name: 'Jenny' } })
].map(inspect.panel);
~~~

So `attribute` and `bind` statements live alongside each other in the Model builder,
and the actual properties and behavior of specific attributes are defined by way
of a class deriving from some `attribute` type. The default types are:

* Simple primitives: `Text`, `Boolean`, `Number`.
* `Date`, which wants `Date` objects in working data but serializes to and from
  epoch milliseconds.
* `Enum`, which fundamentally works with Strings but has a notion of its available
  possible values.
* `Model` and `List` expect their respective structure types, and are mostly used
  to simplify (de)serialization.
* `Reference` manages a reference to a remote data resource. It gets its [own
  entire chapter](/theory/requests-resolvers-references).

All attribute types share a few methods in common. One of these is `.default()`,
which you see above. It doesn't show up in the inspector because default values
are not eagerly injected into the data, but rather lazily pulled on `.get()` or
`.watch()`. Alongside `.default` is `.writeDefault`, whose purpose we also
demonstrate here:

~~~
class Person extends Model {}
const Dog = Model.build(
  attribute('status', class extends attribute.Enum {
    default() { return 'available'; }
    values() { return [ 'adopted', 'pending', 'available' ]; }
  }),

  attribute('owner', class extends attribute.Attribute {
    default() { return new Person(); }
  })
);

const spot = new Dog({ name: 'Spot' });
const gadget = new Dog({ name: 'Gadget' });
gadget.get('owner').set('name', 'Jenny');

return [
  spot.get('status'),
  spot,
  gadget,
  gadget.get('owner'),
  gadget.get('owner').get('name')
].map(inspect.panel);
~~~

Spot didn't end up with a `status`, nor did Gadget end up with an owner named Jenny.
This is because neither attribute set `.writeDefault` to true. In the case of `status`,
this just means the value is ethereal each time it is fetched. In the case of `owner`,
it's even more confusing: because a new default `Person` is generated each time,
the Person we name Jenny just disappears immediately.

When `.writeDefault` is set to true, the default value is persisted whenever it
is fetched. (_Not_ when the Model is generated! It's still a lazy value.) Because
forgetting this detail and neglecting to set `.writeDefault` can lead to especially
confusing behavior for Models and Lists, `attribute.Model` and `attribute.List`
actually default true for `.writeDefault`&mdash;this is why we use the generic base
class `attribute.Attribute` in the sample above.

Here's another sample with these issues fixed, and which demonstrates a little
shortcut for all this anonymous class stuff:

~~~
class Person extends Model {}
const Dog = Model.build(
  attribute('status', class extends attribute.Enum {
    get writeDefault() { return true; }
    default() { return 'available'; }
    values() { return [ 'adopted', 'pending', 'available' ]; }
  }),

  dēfault.writing('listed', true, attribute.Boolean),

  attribute('owner', class extends attribute.Model {
    default() { return new Person(); }
  })
);

const spot = new Dog({ name: 'Spot' });
spot.get('owner').set('name', 'Jenny');

return [
  spot.get('status'),
  spot.get('listed'),
  spot
].map(inspect.panel);
~~~

We use the silly `ē` because `default` is a reserved keyword in Javascript. If
you don't like it, you can also use `dfault`. If you don't want your attribute
to write its default, you can omit `.writing`, and if you don't care about the
type of the attribute, you don't need to provide the third argument.

If you ever want to get the actual instance of these (usually anonymous) Attribute
classes, you can use `model.attribute('key')`. It'll be rare that you have to do
this, but typically it would be for the purposes of serialization or editor
rendering, which are the next two things we shall cover.

Attribute Serialization
-----------------------

The `.serialize` and `@deserialize` methods are also standard for all attributes.
They can be called to override the standard (de)serialization option for the value
at that key, and are straightforward:

~~~
const Dog = Model.build(
  // say the server communicates numbers as strings:
  attribute('age', class extends attribute.Number {
    serialize() { return this.getValue().toString(); }
    static deserialize(data) { return parseFloat(data); }
  }),

  bind('dog_age', from('age').map(x => x * 7)),
  attribute('dog_age', class extends attribute.Number {
    get transient() { return true; }
  })
);

return [
  Dog.deserialize({ name: 'Gadget', age: '7', city: 'Seattle' }),
  (new Dog({ name: 'Spot', age: 4 })).serialize()
].map(inspect.panel);
~~~

The default `Model` and `List` attribute deserializers just defer to the given
`modelClass`'s `@deserialize` method, which you may also override. Marking an
attribute as `.transient` will, if the default `.serialize` is in use, omit that
property from the serialization.

> As with `default`s, there is a shortcut to invoke this: `transient('key')`.

Attribute Editors
-----------------

Another big function attributes provide is to serve as classtypes we can latch
onto when trying to `render` editors for our attributes, as well as to define
properties about the data and therefore how the editors should function. The [Janus
Standard Library](/stdlib) provides general-purpose editors for all the default
types; a good example focuses around the `Enum` attribute type:

~~~
// Models:
const Document = Model.build(
  dēfault('name', 'Untitled', attribute.Text),
  attribute('content', attribute.Text)
);
const Window = Model.build(
  dēfault.writing('documents', () => new List([ new Document() ])),

  attribute('current_document', class extends attribute.Enum {
    default() { return this.model.get('documents').at(0); }
    values() { return from('documents'); }
  })
);

// Views:
const DocumentEditView = DomView.build(
  $('<div class="document"><div class="title"/><div class="content"/></div>'),
  template(
    find('.title').render(from.attribute('name')).context('edit'),
    find('.content').render(from.attribute('content'))
      .criteria({ context: 'edit', style: 'multiline' })));

const DocumentSummaryView = DomView.build(
  $('<div class="document-summary"/>'),
  find('.document-summary').text(from('name')));

const WindowView = DomView.build($(`
  <div class="window">
    <div class="documents">
      <div class="doc-list"/>
      <button class="new-doc">&oplus;</button>
    </div>
    <div class="current"/>
  </div>`), template(
  find('.documents .doc-list').render(from.attribute('current_document'))
    .criteria({ context: 'edit', style: 'list' }),
  find('.current').render(from('current_document')),

  find('.documents .new-doc').on('click', (_, subject) => {
    subject.get('documents').add(new Document()); })));

// Assembly:
const app = new App();
stdlib.view.registerWith(app.get('views'));
app.get('views').register(Document, DocumentEditView);
app.get('views').register(Document, DocumentSummaryView, { context: 'summary' });
app.get('views').register(Window, WindowView);

return app.view(new Window());
~~~
~~~ styles
.window .documents {
  overflow: hidden;
}
.window .doc-list,
.window .doc-list li,
.window .new-doc {
  float: left;
}
.window .janus-list-selectItem {
  cursor: default;
  padding: 0.3em 0.7em 0.1em;
  position: relative;
}
.window .janus-list-selectItem.checked {
  background-color: #d7d7d7;
}
.window .janus-list-selectItem button.janus-list-selectItem-select {
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  top: 0;
  width: 100%;
}
.window .document-summary {
  font-size: 1.2em;
}
.window .new-doc {
  background: none;
  border: none;
  font-size: 1.4em;
  font-weight: bold;
  margin-left: 0.5em;
  outline: none;
  padding: 0;
}
.window .current {
  background-color: #d7d7d7;
  border-radius: 0 0 0.2em 0.2em;
  padding: 1em;
}
.window .document .title {
  border-bottom: 1px dotted #999;
  margin-bottom: 0.8em;
  padding-bottom: 0.5em;
}
.window .document .title input {
  background: none;
  border: none;
  font-size: 1.6em;
  font-weight: bold;
  margin: 0;
  outline: 0;
  padding: 0;
  width: 100%;
}

.window .document .content textarea {
  background: #f7f7f7;
  border: none;
  height: 20em;
  max-width: 100%;
  min-width: 100%;
  outline: 0;
  width: 100%;
}
~~~

Once again, we demonstrate several points in this sample. We show how attribute
editors are rendered with the standard library, but we also illustrate some broader
points about problem-solving in Janus.

As far as `render`ing attributes is concerned, the only truly canonical aspect
demonstrated here is the use of `from.attribute('key')` to pull up the Attribute
object representing the behavior of that key, rather than the value residing at
the key. Once that attribute class instance is resolved from the `from` chain,
`render` will search for a matching view registration like it would for any other
class instance.

We register all the `stdlib` views so it'll find default views for our attributes.
The particular `context` and `style` values you see are simply the convention
applied throughout the standard library&mdash;they are not core to Janus itself.

You can also see that the Enum attribute `values()` method is allowed to return
a `from` expression instead of a `List` (or, for that matter, a `Varying` would
work too, so we could have written `this.model.watch('documents')`). This fact
is natural in the context of a framework where we strive to deal gracefully with
changes, and it helps us solve the problem here of managing a set of tabbed views.

As we've began to stress, problem solving in Janus often boils down to data modelling.
It would be entirely possible to create some ad-hoc jQuery-driven method for
listening to some List of documents and rendering the appropriate view when tabs
are clicked, updating the list of tabs and the actively-selected one as needed.

Or, you can think about the problem in a different way, and consider it from a
data modelling perspective: what, fundamentally is the purpose of a tab bar? It's
to choose one of a known set of options. There is some object that is the selected
value, and there is some known list of options of which that object is one. This
is exactly an Enum attribute, and by modelling our data structure after that
interpretation, we can simplify the entire problem drastically, relying on the
prebuilt standard library views to accomplish our task.

> It might be worth right-clicking on the tabs and inspecting their HTML structure.
> There is actually a `<button>` that the standard library tries to render, which
> we coöpt with CSS to achieve the impression of a tab.

The end result of this is that not only have we saved ourselves a lot of work,
we've grounded the resulting implementation entirely in simple data operations.
Notice how the _only_ custom event handler, the only imperative code we wrote,
does nothing more than add a new Document to the list. There is almost no opportunity
to make a coding error, once the data has been structured correctly.

> Again, we will not be covering Reference attributes in this chapter, as they
> get explained alongside Requests and Resolvers, which are the mechanisms whereby
> Reference attributes actually acquire values.
>
> There is also, by the way, no reason you can't define your own Attribute types
> specific to your application.

Model Validation
----------------

The very last topic to overview about Models is that of validation. Janus provides
a relatively lean interface for model validation: you may define one or more validation
rules. Each of these are just `from` expressions that result in one of the `janus.types.validity`
case classes: `valid` or `invalid`. There are standard methods to get the outstanding
failing issues, or all the validation bindings, or just whether the Model is passing
validation or not.

We want to provide a standard interface at all here, for reasons much like our
motivations behind [case classes](/theory/case-classes#a-practical-example) in
the first place: to give a basic common language for this process within Janus,
to promote interoperability and reusability with minimal glue and configuration.
The [Manifest](/theory/app-and-applications), for instance, which helps manage
server-side render lifecycles, uses Model validation to determine whether it
should return your rendered view/page as a successful result or fault over to
some error page instead.

On the other hand, we want to provide the smallest interface possible, to enable
a broad range of approaches to the problem space. Do you want to encode information
about which fields are failing the validation? Nest it (as another case class,
perhaps?) within the `valid`/`invalid` class. Do you want to declare validation
rules in some way other than the Janus default? You have exactly one method to
implement to make the standard machinery work.

> That one method you'd need to implement, by the way, is `.validations()`, which
> ought to return a `List[types.validity]`.

Here, we stick to the Janus default. You will not be surprised to learn that
validation rules are specified alongside `bind`s and `attribute`s as a part of
`Model.build`. We also demonstrate `.valid`, which returns a `Varying[boolean]`
indicating whether all validation rules are passing, and `.issues`, which returns
a List of only the failing validation results.

~~~
const Person = Model.build();
const Dog = Model.build(
  attribute('status', class extends attribute.Enum {
    default() { return 'available'; }
    values() { return [ 'adopted', 'pending', 'available' ]; }
  }),

  validate(from('name').map(name => (name == null)
    ? types.validity.invalid('All pets must have names.')
    : types.validity.valid())),

  validate(from('status').and('owner').all.map((status, owner) =>
    ((owner != null) && (status !== 'adopted'))
      ? types.validity.invalid('Only adopted pets may have owners assigned.')
      : types.validity.valid()))
);

const spot = new Dog({ name: 'Spot', owner: new Person({ name: 'Jenny' }) });
const dog = new Dog();
const gadget = new Dog({ name: 'Gadget' });

return [
  spot.validations(), spot.valid(), spot.issues(),
  dog.valid(), dog.issues(),
  gadget.valid(), gadget.issues()
].map(inspect);
~~~

Translating this information into feedback for the user is left to applications
to work out. Here is one example of how it may be done:

~~~
const { valid, invalid } = types.validity;
const Issue = Model.build();
const isBlank = (x => (x == null) || (x === ''));

// model helpers to reduce some boilerplate:
const check = (condition, message, fields) => (...args) => condition(...args)
  ? invalid(new Issue({ message, fields })) : valid();

const Dog = Model.build(
  attribute('name', attribute.Text),

  attribute('status', class extends attribute.Enum {
    default() { return 'available'; }
    values() { return [ 'adopted', 'pending', 'available' ]; }
  }),

  // note that we just use Text for owner for this one to keep things simple.
  attribute('owner', attribute.Text),

  validate(from('name').map(check(isBlank,
    'All pets must have names.', [ 'name' ]))),

  validate(from('status').and('owner').all.map(check(
    ((status, owner) => !isBlank(owner) && (status !== 'adopted')),
    'Only adopted pets may have owners assigned.', [ 'owner', 'status' ])))
);

// view helpers, again to reduce boilerplate:
const applyValidationClass = (field) => find(`.${field}`).classed('invalid',
  from.self(view => view.subject.issues()).flatMap(issues =>
    issues.any(issue => issue.get('fields').includes(field))));

const renderField = (field) => template(
  applyValidationClass(field),
  find(`.${field} .input`).render(from.attribute(field)).context('edit'));

const DogEditor = DomView.build($(`
  <div class="dog-editor">
    <div class="issues"/>
    <label class="line name">Name <span class="input"/></label>
    <label class="line status">Status <span class="input"/></label>
    <label class="line owner">Owner <span class="input"/></label>
  </div>`), template(
  find('.issues').render(from.self(view => view.subject.issues())),
  renderField('name'),
  renderField('status'),
  renderField('owner')));

const IssueView = DomView.build($('<span/>'),
  find('span').text(from('message')));

const app = new App();
stdlib.view.registerWith(app.get('views'));
app.get('views').register(Issue, IssueView);
app.get('views').register(Dog, DogEditor);

return app.view(new Dog());
~~~
~~~ styles
.dog-editor .issues {
  margin-bottom: 0.8em;
}
.dog-editor .issues li {
  color: red;
  font-weight: bold;
}
.dog-editor .issues li:before {
  content: '×';
  padding-right: 0.2em;
}
.dog-editor label {
  display: block;
  padding-bottom: 0.7em;
}
.dog-editor label.invalid {
  color: red;
}
~~~

Here we define our own `Issue` class that we use to represent information about
the validation failure: the message text to display and the fields involved in
the problem. We don't bother making `fields` a List&mdash;it's just an array&mdash;since
in our application the related fields never change. The `check` function helps us
encapsulate this structure in a succinct declaration.

Similarly, we create a helper for our editor view (which you could imagine using
across all the different views in your application) which, for some field, checks
whether any of the subject Model's `.issues` relates to that field, and applies
an `invalid` class if so.

Recap
=====

Maps and Models are an important backbone in Janus. As one of the two fundamental
data structures we provide, they serve a crucial purpose not just in directly
representing actual data, but also in gluing together the simple primitives you
have thus far encountered into meaningful conglomerations.

Maps are the pure data structure essence behind Models:

* They perform all the key/value storage (`.get`, `.set`) and key `.watch`ing.
  * Keys may be nested into subobjects, but you should take care when directly
    `.get`ting or `.watch`ing a subobject instead of a data leaf.
* They support `.shadow` copying, allowing interrelated clones of your data.
  * This can be useful when trying to manage multiple versions of data, for
    instance when the user wants to edit something.
* They are enumerable and mappable.
  * `.enumeration` gets you the keys of a Map, which is useful when dealing with
    unknown schemas or solving problems where data must be listable (for instance
    to render) but also quick to lookup by some key.
  * The `.serialize` and `.diff` features supported by Map are enabled by Traversals,
    which you don't need to understand to leverage these features but which add
    great flexibility and power [if you do](/further-reading/traversal).
  * Maps can map (`.mapPairs`) to other Maps, with the same key structure. If
    you use `.flatMapPairs` instead, you can use a Varying to define that mapping.

Models extend Maps to provide behavioral definition on top of the pure data.

* Data `bind`ing of keys can help compute derived values that, for instance, the
  server API requires.
  * They're also very useful when used on View Models.
  * But perhaps more importantly, they help sequence complex computations based
    off of ground truth, turning Models into potent problem-solving spaces.
* Named `attribute`s define a whole set of available behaviors for particular
  pieces on data in the Map:
  * They serve as class types that `render` can recognize for pulling up editor
    views for individual data attributes.
  * `.default` values may be defined. You'll want to `.writeDefault` in some cases.
  * Custom (de)serialization can be defined per key (though again, the full Traversal
    offers far more granular control).
  * And some attribute types, like Enum, Model, and List, have some domain-specific
    behaviors in the form of additional properties and methods known to the framework
    and the standard library.
* Model validation is a very thin but therefore very flexible interface for defining
  validation rules.
  * `validate()` declarations are made during Model `build`ing just like `bind` and
    `attribute`, and their only requirement is that they must resolve to a `Varying[types.validity]`.

We've also began to see, now that we have more powerful tools at our disposal,
what problem solving looks like in Janus.

* Complex interaction patterns become tractable when time and care is taken to
  boil the problem down to its minimal set of ground truth values.
  * Each piece of ground truth can usually be fed information simply and directly,
    with no cognitive overhead on object state or corner cases. This works best
    when each truth element is set directly an unconditionally from a single source.
  * Derived values based on that ground truth can then be bound in the same Model,
    and they will be recomputed only as necessary.
  * This essentially turns Model into a problem-solving space, one in which classical
    concerns like line ordering and object state becomes irrelevant.
  * You saw this when we created a modestly complicated dragging example. Ultimately,
    the entire interaction was driven off of four values.
* Many, many problems can be solved by thinking of the problem in terms of data
  and semantics. Janus is quite good at data transformations and bindings, so once
  you get the right data model in place there is often very little need for custom
  implementation code.
  * You saw this when we modelled a tabbed view as an Enum attribute based on the
    List of the views; picking one of many options is the same process as picking
    one of many tabs.
* The open-endedness in Janus is carefully structured to ground everybody in the
  same common language while leaving a lot of room for interpretation and creativity.
  * Model validation is a great example.
  * The case class encapsulates the most important fact (valid or not?) while
    carrying any arbitrary value most suited for your application.
  * You saw this when we created a rich representation of validation failures
    which could then drive an advanced user feedback experience.

Next Up
=======

We're not exactly done with Models and attributes yet; our [next chapter](/theory/requests-resolvers-references)
will dive into one particular type of attribute, Reference, which allows you to
reference data that should be fetched and inserted when needed.

Along with Request, which describes the remote data, and Resolvers, which actually
go and get the data, this subsystem equips Janus with a data-driven, Varying-based
solution to networking.

