Flyouts
=======

It can be a pain to manage flyouts. Write your own system, and you have to dig
through the DOM and manage fidgety debounces and delays. Use a library, and you
get to deal with its idiosyncrasies.

A Custom Mutator
----------------

Here's one way to solve the problem in Janus, which involves writing a custom
mutator so that we can just use a View as our flyout content. It might seem a
little overwhelming at first, but once we take a closer look it should make sense,
and the usage (just `.flyout(from('detail'))`) is deliciously clean.

~~~
// inspection things just for the sample:
const inspected = new List();
const inspecting = (x) => { inspected.add(x); return x; };

// imports and util
const { fromEvents, sticky } = stdlib.varying;
const isHovered = (dom) => (dom == null)
  ? false
  : fromEvents(dom, false, { mouseenter: true, mouseleave: false });

// Flyout Model and View
class Flyout extends Model.build(
  bind('hover-tr', from('trigger').flatMap(isHovered)),
  bind('hover-fl', from('flyout').flatMap(isHovered)),
  bind('hover-net', from('hover-tr').and('hover-fl').all.map((t, f) => t || f)),
  bind('hovered', from('hover-net').pipe(sticky({ true: 300 })))
) {};

class FlyoutView extends DomView.build(
  $('<div class="sample-flyout"/>'),
  find('div').render(from('subject'))
) {
  _wireEvents() {
    // remove flyout if the Flyout model is destroyed, or if hover stops.
    this.destroyWith(this.subject);
    this.reactTo(this.subject.get('hovered'), hovered => {
      if (hovered !== true) this.destroy();
    });

    // position the flyout, somewhat primitively for this sample.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const offset = trigger.offset();
    dom.css('left', Math.min(offset.left, window.innerWidth - dom.width()));
    dom.css('top', offset.top + trigger.outerHeight());
  }
}

// flyout mutator
const flyout = (data) => (dom, point) =>
  Varying.managed(
    (() => inspecting(new Flyout({ trigger: dom, subject: data.all.point(point) }))),
    (model) => model.get('hovered').map(hovered => ({ model, hovered }))
  ).react(false, ({ model, hovered }) => {
    if (hovered !== true) return;
    const view = app.view(model);
    $('body').append(view.artifact());
    view.wireEvents();
    model.set('flyout', view.artifact());
  });

// build a custom mutator set:
const ourfind = find.build(Object.assign({ flyout }, mutators));


// now use the flyout in some sample context:

class Thing extends Model {};
const ThingView = DomView.build(
  $('<div/>'),
  ourfind('div')
    .text(from('name'))
    .flyout(from('detail')));

class Detail extends Model {};
const DetailView = DomView.build($(`
  <div><h2/><p/></div>`), template(
  ourfind('h2').text(from('name')),
  ourfind('p').text(from('description'))
));

const things = new List([
  new Thing({ name: 'A', detail:
    new Detail({ name: 'Aardvark', description: 'a nocturnal afrothere' }) }),
  new Thing({ name: 'B', detail:
    new Detail({ name: 'Bear', description: 'a carnivorous mammal' }) }),
  new Thing({ name: 'C', detail:
    new Detail({ name: 'Cougar', description: 'a really big cat' }) })
]);

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Flyout, FlyoutView);
app.views.register(Thing, ThingView);
app.views.register(Detail, DetailView);

return [ app.view(things), inspected.map(inspect.panel) ];
~~~

~~~ styles
.sample-flyout {
  background-color: #fff;
  box-shadow: 0 0.3em 0.5em rgba(0, 0, 0, 0.12);
  padding: 1em;
  position: absolute;
  z-index: 9999;
}
~~~

Let's break this down a bit, starting with the `Flyout` Model.

~~~ noexec
const { fromEvents, sticky } = stdlib.varying;
const isHovered = (dom) => (dom == null)
  ? false
  : fromEvents(dom, false, { mouseenter: true, mouseleave: false });

// Flyout Model and View
class Flyout extends Model.build(
  bind('hover-tr', from('trigger').flatMap(isHovered)),
  bind('hover-fl', from('flyout').flatMap(isHovered)),
  bind('hover-net', from('hover-tr').and('hover-fl').all.map((t, f) => t || f)),
  bind('hovered', from('hover-net').pipe(sticky({ true: 300 })))
) {};
~~~

First here, we pull out some Varying utilities from the standard library. The
`fromEvents` helper takes a DOM node, an initial value, and an object mapping
event names to values. It returns a Varying carrying the initial value. Then,
each time any of the named events we pass in is emitted, the value we specify
will be set into the Varying. In this case, we can use `mouseenter` and `mouseleave`
as a quick way to get a `Varying[Bool]` indicating if the mouse is in our target
area.

The `sticky` helper takes a Varying, and also a configuration object. For each
key in the object, that value will be "sticky" for the given number of milliseconds
after the value has changed away. So in this case, if the `hover-net` value changes
from `true` to `false`, `hovered` will remain `true` for 300ms. But if `hover-net`
changes from `"blue"` to `"green"`, that change is immediately reflected.

So with these two helpers, one which binds in data from the DOM, and another which
affects the flow of data within our Model, we can build this simple `Flyout` tracker.

It must be fed a `trigger` DOM node, which is the one which should trigger the
flyout to appear when hovered. It also accepts a `flyout` DOM node, whenever one
is actually shown.

From these, it computes `hover-tr` and `hover-fl`, which use the `fromEvents`
helper to track whether the mouse is actively hovered on the trigger and the flyout,
respectively. These are logical-`or`ed together into `hover-net`.

We want to give the user some leniency in moving their mouse between the trigger
and the flyout, or vice versa, or to stray and return in general, without blowing
away the flyout. So here we `sticky` the `hover-net` value on `true` for 300ms,
and that final "should we be showing a flyout?" value is stored at `hovered`.

~~~ noexec
class FlyoutView extends DomView.build(
  $('<div class="sample-flyout"/>'),
  find('div').render(from('subject'))
) {
  _wireEvents() {
    // remove flyout if the Flyout model is destroyed, or if hover stops.
    this.destroyWith(this.subject);
    this.reactTo(this.subject.get('hovered'), hovered => {
      if (hovered !== true) this.destroy();
    });

    // position the flyout, somewhat primitively for this sample.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const offset = trigger.offset();
    dom.css('left', Math.min(offset.left, window.innerWidth - dom.width()));
    dom.css('top', offset.top + trigger.outerHeight());
  }
}
~~~

The `FlyoutView` itself is many lines of code, but it doesn't do much. The bound
template does nothing more than `.render` the `subject` in the flyout itself.

When events are bound, we do two major tasks.

The first is to ensure the `FlyoutView` is destroyed at the appropriate points:
if the `Flyout` Model itself is destroyed, the View should be as well. (Why might
the Model be destroyed? We'll cover that while discussing the next snippet.) In
addition, if the `hovered` value we computed earlier on the Model becomes `false`,
we should destroy the `FlyoutView`. It's no longer wanted.

The second is to position the View itself. This is a somewhat simplistic version
of such code, for the sake of keeping the sample code short.

~~~ noexec
const flyout = (data) => (dom, point) =>
  Varying.managed(
    (() => new Flyout({ trigger: dom, subject: data.all.point(point) })),
    (model) => model.get('hovered').map(hovered => ({ model, hovered }))
  ).react(false, ({ model, hovered }) => {
    if (hovered !== true) return;
    const view = app.view(model);
    $('body').append(view.artifact());
    view.wireEvents();
    model.set('flyout', view.artifact());
  });
~~~

Our mutator itself is where we glue the Model and View components together into
a working interaction.

You [might recall](/theory/views-templates-mutators) that mutators are expected
to conform to a particular call signature:

~~~ noexec
(...arguments) => (dom, point, immediate) => Observation
~~~

We can take any number of `arguments`, but here we're just interested in the Model
we should be rendering when the flyout appears. We take `dom`, `point`, and
`immediate`—but `immediate` is mostly useful for `.attach`ing to content rendered
on the server once it lands on the client, and it doesn't seem likely the server
is going to spend much time mousing over things for flyouts. So we don't bother.

Finally, we should return an `Observation` ticket. Whenever that `Observation`
is `.stop`ped, we promise that this mutation is halted and all its resources are
cleaned up.

Well, we have this tracking `Flyout` Model that we want to persist for as long
as the trigger remains on screen. It's a resource which should live as long as
the `Observation` ticket. So [`Varying.managed`](/theory/resource-management) is
our solution here. It will do the work to create the `new Flyout` for us as soon
as the mutator is activated, and to `.destroy()` it when the mutator is `.stop`ped.

Given that `Flyout`, we are mostly interested in that computed `hovered` value.
But we also need the Flyout `model` itself to work with when that `hovered` state
changes, so we combine them together and ship them out as our Varying value.

> Got a clever way to avoid this? Try it out, and make a pull request!

Then we just have to keep an eye on `hovered`. If it's changed to `true`, we need
to create a new `FlyoutView`, drop it on the document `<body>`, and inform the
`model` that we have done so.

> A critical idea here is how the resources get created and destroyed at the appropriate
> times. Take a look at the sample again, and make sure you're convinced it works.

~~~ noexec
module.exports = {
  find: find.build(Object.assign({ flyout }, mutators))
};
~~~

Then, once we build our own set of mutators into a new `find` object, we can `require`
our own `find` instead, and use `.flyout()` anywhere we'd like.

A More Direct Approach
----------------------

If you don't want or need a mutator, you can take a more direct approach. This
is roughly how Janus does it:

~~~
// imports and util
const { fromEvents, sticky } = stdlib.varying;
const isHovered = (initial) => (dom) => (dom == null)
  ? false
  : fromEvents(dom, initial, { mouseenter: true, mouseleave: false });

// Flyout Model and View
class Flyout extends Model.build(
  bind('hover-tr', from('trigger').flatMap(isHovered(true))),
  bind('hover-fl', from('flyout').flatMap(isHovered(false))),
  bind('hover-net', from('hover-tr').and('hover-fl').all.map((t, f) => t || f)),
  bind('hovered', from('hover-net').pipe(sticky({ true: 300 })))
) {
  _initialize() {
    // destroy ourselves if the flyout should go away
    this.reactTo(this.get('hovered'), false, hovered => {
      if (hovered !== true) this.destroy();
    });
  }
};

class FlyoutView extends DomView.build(
  $('<div class="sample-flyout"/>'),
  find('div').render(from('subject')).context(from('context'))
) {
  _wireEvents() {
    this.subject.set('flyout', this.artifact());

    // position the flyout, somewhat primitively for this sample.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const offset = trigger.offset();
    dom.css('left', Math.min(offset.left, window.innerWidth - dom.width()));
    dom.css('top', offset.top + trigger.outerHeight());
  }
}

// custom App
class SampleApp extends App.build(
  initial.writing('flyouts', new List())
) {
  flyout(trigger, subject, context = 'flyout') {
    const flyouts = this.get_('flyouts');
    for (const flyout of flyouts)
      if (flyout.get_('trigger').is(trigger))
        return; // bail out if we're already showing this flyout.

    flyouts.add(new Flyout({ trigger, subject, context }));
  }
}

const SampleAppView = DomView.build($(`
  <div>
    <div class="sample-content"/>
    <div class="sample-flyouts"/>
  </div>`), template(
  find('.sample-content').render(from('things')),
  find('.sample-flyouts').render(from('flyouts'))
));

// now use all of it in some sample context:

class Thing extends Model {};
const ThingView = DomView.build(
  $('<div/>'),
  find('div')
    .text(from('name'))
    .on('mouseenter', (event, subject, view) => {
      view.options.app.flyout($(event.target), subject);
    }));

const ThingDetailView = DomView.build($(`
  <div><h2/><p/></div>`), template(
  find('h2').text(from('name')),
  find('p').text(from('description'))
));

const things = new List([
  new Thing({ name: 'Aardvark', description: 'a nocturnal afrothere' }),
  new Thing({ name: 'Bear', description: 'a carnivorous mammal' }),
  new Thing({ name: 'Cougar', description: 'a really big cat' })
]);

const app = new SampleApp({ things });
stdlib.view($).registerWith(app.views);
app.views.register(SampleApp, SampleAppView);
app.views.register(Flyout, FlyoutView);
app.views.register(Thing, ThingView);
app.views.register(Thing, ThingDetailView, { context: 'flyout' });

return [
  app.view(app),
  inspect(app.get_('flyouts')),
  app.get_('flyouts').map(inspect.panel)
];
~~~

Starting from the top:

~~~ noexec
// imports and util
const { fromEvents, sticky } = stdlib.varying;
const isHovered = (initial) => (dom) => (dom == null)
  ? false
  : fromEvents(dom, initial, { mouseenter: true, mouseleave: false });

// Flyout Model and View
class Flyout extends Model.build(
  bind('hover-tr', from('trigger').flatMap(isHovered(true))),
  bind('hover-fl', from('flyout').flatMap(isHovered(false))),
  bind('hover-net', from('hover-tr').and('hover-fl').all.map((t, f) => t || f)),
  bind('hovered', from('hover-net').pipe(sticky({ true: 300 })))
) {
  _initialize() {
    // destroy ourselves if the flyout should go away
    this.reactTo(this.get('hovered'), false, hovered => {
      if (hovered !== true) this.destroy();
    });
  }
};

class FlyoutView extends DomView.build(
  $('<div class="sample-flyout"/>'),
  find('div').render(from('subject')).context(from('context'))
) {
  _wireEvents() {
    this.subject.set('flyout', this.artifact());

    // position the flyout, somewhat primitively for this sample.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const offset = trigger.offset();
    dom.css('left', Math.min(offset.left, window.innerWidth - dom.width()));
    dom.css('top', offset.top + trigger.outerHeight());
  }
}
~~~

~~~ styles
.sample-flyouts { font-size: 0.7em; }
~~~

_Most_ of this code is the same as it was in the mutator-based sample at the top
of this page. But here, our setup is quite different: there is no `Flyout` Model
that continually exists for each trigger, surviving and monitoring across multiple
hovers and exits. Rather, we only spawn the Flyout when `app.flyout` is called
and we know for sure we'd like one.

Correspondingly, we move the `.destroy()` trap from the View to the Model. We want
to destroy the whole Model when we leave, since a new one will be created upon
the next hover event.

But because of these changes, simply setting the `fromEvents` initial value to
`false` will not work: the Flyout will be created, the `mouseenter` event has
already occurred, both hover values will be `false`, and the Model will `.destroy()`
itself immediately. This doesn't happen in the other sample because the Model
itself is what sees the `mouseenter`.

So we upgrade `isHovered` to let us specify an initial value explicitly.

The changes to the `FlyoutView` are pretty minor: we upgrade it to let us specify
an explicit `context` for `.render`, and instead of trapping a dehover and destroying
the View, we inform the Model that we are the View for it.

~~~ noexec
class SampleApp extends App.build(
  initial.writing('flyouts', new List())
) {
  flyout(trigger, subject, context = 'flyout') {
    const flyouts = this.get_('flyouts');
    for (const flyout of flyouts)
      if (flyout.get_('trigger').is(trigger))
        return; // bail out if we're already showing this flyout.

    flyouts.add(new Flyout({ trigger, subject, context }));
  }
}

const SampleAppView = DomView.build($(`
  <div>
    <div class="sample-content"/>
    <div class="sample-flyouts"/>
  </div>`), template(
  find('.sample-content').render(from('things')),
  find('.sample-flyouts').render(from('flyouts'))
));
~~~

Here is the big divergence from the earlier sample: rather than spawn the Flyout
views independently and drop them directly on the `<body>`, we have a reserved
node as part of our overall App View which hosts all our chrome and content, and
we `.render` the List of Flyouts within it. This way, when Flyouts are created
and destroyed, we don't have to managed their addition and removal to the page.

When `flyout()` is called, it takes a `trigger` node, the `subject` to be rendered,
and optionally a `context` for `.render` (which we pass along to the Flyout model,
whose eventual fate you saw earlier).

We first search through all our existing flyouts to be sure we haven't already
got the flyout in question. This way, if you wiggle over the trigger, you don't
get tons of duplicate flyouts. If we don't, we simply create the Flyout Model
and add it to our list of flyouts.

Somewhat More Automatic
-----------------------

If you don't want to call `app.flyout`, there are other approaches you can take.
This sample is nearly identical to the previous approach, we just move the `app.flyout`
call from the `ThingView` up to the `SampleAppView`.

~~~
// imports and util
const { fromEvents, sticky } = stdlib.varying;
const isHovered = (initial) => (dom) => (dom == null)
  ? false
  : fromEvents(dom, initial, { mouseenter: true, mouseleave: false });

// Flyout Model and View
class Flyout extends Model.build(
  bind('hover-tr', from('trigger').flatMap(isHovered(true))),
  bind('hover-fl', from('flyout').flatMap(isHovered(false))),
  bind('hover-net', from('hover-tr').and('hover-fl').all.map((t, f) => t || f)),
  bind('hovered', from('hover-net').pipe(sticky({ true: 300 })))
) {
  _initialize() {
    // destroy ourselves if the flyout should go away
    this.reactTo(this.get('hovered'), false, hovered => {
      if (hovered !== true) this.destroy();
    });
  }
};

class FlyoutView extends DomView.build(
  $('<div class="sample-flyout"/>'),
  find('div').render(from('subject')).context(from('context'))
) {
  _wireEvents() {
    this.subject.set('flyout', this.artifact());

    // position the flyout, somewhat primitively for this sample.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const offset = trigger.offset();
    dom.css('left', Math.min(offset.left, window.innerWidth - dom.width()));
    dom.css('top', offset.top + trigger.outerHeight());
  }
}

// custom App
class SampleApp extends App.build(
  initial.writing('flyouts', new List())
) {
  flyout(trigger, subject, context = 'flyout') {
    const flyouts = this.get_('flyouts');
    for (const flyout of flyouts)
      if (flyout.get_('trigger').is(trigger))
        return; // bail out if we're already showing this flyout.

    flyouts.add(new Flyout({ trigger, subject, context }));
  }
}

const SampleAppView = DomView.build($(`
  <div class="sample-app">
    <div class="sample-content"/>
    <div class="sample-flyouts"/>
  </div>`), template(
  find('.sample-content').render(from('things')),
  find('.sample-flyouts').render(from('flyouts')),
  find('.sample-app').on('mouseenter', '.flies-out', (event, app) => {
    const trigger = $(event.target);
    const subject = trigger.data('view').subject;
    app.flyout(trigger, subject);
  })
));

// now use all of it in some sample context:

class Thing extends Model {};
const ThingView = DomView.build(
  $('<div class="flies-out"/>'),
  find('div').text(from('name'))
);

const ThingDetailView = DomView.build($(`
  <div><h2/><p/></div>`), template(
  find('h2').text(from('name')),
  find('p').text(from('description'))
));

const things = new List([
  new Thing({ name: 'Aardvark', description: 'a nocturnal afrothere' }),
  new Thing({ name: 'Bear', description: 'a carnivorous mammal' }),
  new Thing({ name: 'Cougar', description: 'a really big cat' })
]);

const app = new SampleApp({ things });
stdlib.view($).registerWith(app.views);
app.views.register(SampleApp, SampleAppView);
app.views.register(Flyout, FlyoutView);
app.views.register(Thing, ThingView);
app.views.register(Thing, ThingDetailView, { context: 'flyout' });

return [
  app.view(app),
  inspect(app.get_('flyouts')),
  app.get_('flyouts').map(inspect.panel)
];
~~~

This is really close to the approach this documentation site takes. We tag any
DOM node which should pop a flyout with a particular class, and in [one central
place](https://github.com/issa-tseng/janus-docs/blob/8602581e2d164995784b0b4544d516a422141ec4/src/model/app.js#L80)
we add a hook that attempts to pull a Flyout for whatever `subject` we find associated
with that node.

> This takes advantage of the fact that [`DomView#wireEvents`](/api/dom-view#wireEvents)
> will attempt to `.data('view', subject)` on its artifact node when called.

This way, you don't have to hook `mouseenter` and call `app.flyout` everywhere.

