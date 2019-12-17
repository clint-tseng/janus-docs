A Simple Draggable
==================

Say you need an object to be freely draggable around the screen. You could reach
for a plugin, or resign yourself to writing a pile of event handling code.

The Basic Idea
--------------

Here's another approach: a simple little drag machine that's only a couple dozen
lines long. The sample code needed to actually demonstrate its use is longer:

~~~
// drag.js

const calc = (input, down, now) => (now != null) ? (input + now - down) : input;
class Drag extends Model.build(
  bind('out.x', from('in.x').and('down.x').and('now.x').all.flatMap(calc)),
  bind('out.y', from('in.y').and('down.y').and('now.y').all.flatMap(calc))
) {
  at_(prop, event) {
    if (arguments.length === 1) return (event => { this.at_(prop, event); });
    const container = this.get_('container');
    const { left, top } = container.position();
    this.set(prop, {
      x: (event.pageX - left) / container.width(),
      y: (event.pageY - top) / container.height()
    });
  }
}

const drag = (parent, xname, yname) => (event, it, view) => {
  event.preventDefault();
  const operation = new Drag({
    container: view.closest_(parent).artifact(),
    in: { x: it.get_(xname), y: it.get_(yname) }
  });
  operation.at_('down', event);
  operation.listenTo($(window), 'mousemove', operation.at_('now'));
  operation.reactTo(operation.get('out.x'), it.set(xname));
  operation.reactTo(operation.get('out.y'), it.set(yname));
  $(window).one('mouseup', (() => { operation.destroy(); }));

  // inspection just for sample purposes only:
  inspected.set(operation);
};

// sample stuffs to be dragged around:

const pct = (x => `${x * 100}%`);

class Workspace extends Model {};
const WorkspaceView = DomView.build($('<div class="workspace"/>'),
  find('div').render(from('boxes')));

class Box extends Model {};
const BoxView = DomView.build($('<div class="box"/>'),
  find('div')
    .css('left', from('left').map(pct))
    .css('top', from('top').map(pct))
    .on('mousedown', drag(Workspace, 'left', 'top')));

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Workspace, WorkspaceView);
app.views.register(Box, BoxView);

const workspace = new Workspace({ boxes: new List([
  new Box({ left: 0.2, top: 0.2 }),
  new Box({ left: 0.5, top: 0.5 }),
  new Box({ left: 0.8, top: 0.8 })
]) });
const view = app.view(workspace);
view.wireEvents();

const inspected = new Varying();
return [ view, inspect.panel(workspace), inspected.map(inspect.panel) ];
~~~

~~~ styles
.workspace {
  border: 1px dotted #999;
  min-height: 15em;
  overflow: hidden;
  position: relative;
}
.workspace .box {
  background: #037d7d;
  border: 1px dotted #fff;
  height: 2em;
  margin-left: -1em;
  margin-top: -1em;
  position: absolute;
  width: 2em;
}
~~~

Looking at the code starting from the top, the first thing we find is the Model
that functions as our temporary data space.

~~~ noexec
const calc = (input, down, now) => (now != null) ? (input + now - down) : input;
class Drag extends Model.build(
  bind('out.x', from('in.x').and('down.x').and('now.x').all.flatMap(calc)),
  bind('out.y', from('in.y').and('down.y').and('now.y').all.flatMap(calc))
) {
  at_(prop, event) {
    if (arguments.length === 1) return (event => { this.at_(prop, event); });
    const container = this.get_('container');
    const { left, top } = container.position();
    this.set(prop, {
      x: (event.pageX - left) / container.width(),
      y: (event.pageY - top) / container.height()
    });
  }
}
~~~

This Model always uses `{ x, y }` as its coördinates, and each value ranges from
`0` to `1`, where, for instance, `0` is the very left and `1` is the very right
of the draggable space.

It expects three pairs of these coördinates: `in` is the initial position of the
object, and `down` is the spot the mouse was actually clicked at. `now` is wherever
the mouse has gotten to since then. Based on these pairs of data, we bind the `out`
coördinates, which indicate where the object should be positioned now. The little
helper function `calc` does this math, accounting for the case that the mouse has
not moved yet (and so `now` is `null`).

Because there is some annoying math to be done to actually compute and set the `down`
and `now` coördinates, we implement the method `at_` to do it for us. It begins
with a little one-line currying script, before fetching the `container` DOM node
from which to compute the positions, and the `.position()` of that container.

Based on these, and the given mouse `event`, we compute the `x` and `y` coördinates,
and set them onto the model at the given property location.

So this is the data space, the little input/output machine that can take input,
possibly with a little help on the math, and bind a useful output. What's then
left to do is to write some code to spin it up and tear it down.

~~~ noexec
const drag = (parent, xname, yname) => (event, it, view) => {
  event.preventDefault();
  const operation = new Drag({
    container: view.closest_(parent).artifact(),
    in: { x: it.get_(xname), y: it.get_(yname) }
  });
  operation.at_('down', event);
  operation.listenTo($(window), 'mousemove', operation.at_('now'));
  operation.reactTo(operation.get('out.x'), it.set(xname));
  operation.reactTo(operation.get('out.y'), it.set(yname));
  $(window).one('mouseup', (() => { operation.destroy(); }));
};
~~~

The `drag` function needs to be called twice to do anything. The first time, it
is merely given generic contextual information: for this particular View, which
parent View should be considered the draggable space? (We can't just use the `.parent_`,
for example, because it is often a `List`, as it is here.) And for this particular
Model, what are the `x` and `y` property names?

The second call is tailored to work directly with an `.on` handler in a `template`.

Given the `event`, the object (`it`) being dragged, and the View that represents
the object, it will:

* Prevent default on the `event` so that dragging does not highlight anything.
* Create a new `operation` and feed it most of the necessary initial information:
  the `container` DOM node of the given `parent`, and the current coördinate of
  the object `it`.
* Set the `down` coördinate immediately based on the `mousedown` data.
* Ensure the `now` coördinate is set any time the mouse moves.
* Bind the `out` coördinate of the `Drag` machine back into the canonical data
  whenever it changes.
* Whenever the mouse is release anywhere, `.destroy()` the `Drag` operation.

Because all the above event listening is done through `.listenTo` and `.reactTo`,
this last bit, that `.destroy()`s the `operation`, will automatically halt all
these side effects. Dismantling the machine halts the operation; the next time
any dragging occurs, a new one can be spun up.

This is often how these sorts of semimodal user interactions work in Janus: some
Model with internal bindings is created to define the maths of the interaction,
some function does the work of binding input into the Model machine and output
back into a useful data space, and some trip is set to dismantle the machine when
the operation should end.

Bounded Dragging
----------------

Maybe you don't like that boxes can get dragged out of sight. It's pretty straightforward
to adjust our math so that this can't happen:

~~~
// drag.js

const clamp = (a => (a < 0 ? 0 : (a > 1 ? 1 : a)));
const calc = (input, down, now) => (now != null) ? (input + now - down) : input;
class Drag extends Model.build(
  bind('out.x', from('in.x').and('down.x').and('now.x').all.flatMap(calc)),
  bind('out.y', from('in.y').and('down.y').and('now.y').all.flatMap(calc)),
  bind('clamped.x', from('out.x').map(clamp)),
  bind('clamped.y', from('out.y').map(clamp))
) {
  at_(prop, event) {
    if (arguments.length === 1) return (event => { this.at_(prop, event); });
    const container = this.get_('container');
    const { left, top } = container.position();
    this.set(prop, {
      x: (event.pageX - left) / container.width(),
      y: (event.pageY - top) / container.height()
    });
  }
}

const drag = (parent, xname, yname, clamped = false) => (event, it, view) => {
  event.preventDefault();
  const operation = new Drag({
    container: view.closest_(parent).artifact(),
    in: { x: it.get_(xname), y: it.get_(yname) }
  });
  operation.at_('down', event);
  operation.listenTo($(window), 'mousemove', operation.at_('now'));
  $(window).one('mouseup', (() => { operation.destroy(); }));

  const outname = (clamped ? 'clamped' : 'out');
  operation.reactTo(operation.get(outname + '.x'), it.set(xname));
  operation.reactTo(operation.get(outname + '.y'), it.set(yname));

  // inspection just for sample purposes only:
  inspected.set(operation);
};

// sample stuffs to be dragged around:

const pct = (x => `${x * 100}%`);

class Workspace extends Model {};
const WorkspaceView = DomView.build($('<div class="workspace"/>'),
  find('div').render(from('boxes')));

class Box extends Model {};
const BoxView = DomView.build($('<div class="box"/>'),
  find('div')
    .css('left', from('left').map(pct))
    .css('top', from('top').map(pct))
    .on('mousedown', drag(Workspace, 'left', 'top', true)));

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Workspace, WorkspaceView);
app.views.register(Box, BoxView);

const workspace = new Workspace({ boxes: new List([
  new Box({ left: 0.2, top: 0.2 }),
  new Box({ left: 0.5, top: 0.5 }),
  new Box({ left: 0.8, top: 0.8 })
]) });
const view = app.view(workspace);
view.wireEvents();

const inspected = new Varying();
return [ view, inspect.panel(workspace), inspected.map(inspect.panel) ];
~~~

Here, we could have just tacked the `clamp` function onto `calc`, but making the
clamping behaviour a passed configuration was just about as straightforward. We
now offer two different output values: `out` and `clamped`. In our `drag` function,
we choose between them.

Resizing Made Easy
------------------

Because we have made the output data binding name configurable, it is easy to
drag different parts of an object without worry about which is what.

~~~
// drag.js - verbatim from our first sample above.

const calc = (input, down, now) => (now != null) ? (input + now - down) : input;
class Drag extends Model.build(
  bind('out.x', from('in.x').and('down.x').and('now.x').all.flatMap(calc)),
  bind('out.y', from('in.y').and('down.y').and('now.y').all.flatMap(calc))
) {
  at_(prop, event) {
    if (arguments.length === 1) return (event => { this.at_(prop, event); });
    const container = this.get_('container');
    const { left, top } = container.position();
    this.set(prop, {
      x: (event.pageX - left) / container.width(),
      y: (event.pageY - top) / container.height()
    });
  }
}

const drag = (parent, xname, yname) => (event, it, view) => {
  event.preventDefault();
  const operation = new Drag({
    container: view.closest_(parent).artifact(),
    in: { x: it.get_(xname), y: it.get_(yname) }
  });
  operation.at_('down', event);
  operation.listenTo($(window), 'mousemove', operation.at_('now'));
  operation.reactTo(operation.get('out.x'), it.set(xname));
  operation.reactTo(operation.get('out.y'), it.set(yname));
  $(window).one('mouseup', (() => { operation.destroy(); }));

  // inspection just for sample purposes only:
  inspected.set(operation);
};

// different sample stuffs to be dragged around:

const { min, abs } = Math;
const delta = (a, b) => abs(a - b);
const pct = (x => `${x * 100}%`);

class Workspace extends Model {};
const WorkspaceView = DomView.build($('<div class="workspace"/>'),
  find('div').render(from('box')));

class Box extends Model {};
const BoxVM = Model.build(
  bind('xmin', from.subject('x1').and.subject('x2').all.map(min)),
  bind('ymin', from.subject('y1').and.subject('y2').all.map(min)),
  bind('width', from.subject('x1').and.subject('x2').all.map(delta)),
  bind('height', from.subject('y1').and.subject('y2').all.map(delta))
);
const handle = (xname, yname) => find(`.h-${xname}-${yname}`)
  .css('left', from(xname).map(pct))
  .css('top', from(yname).map(pct))
  .on('mousedown', drag(Workspace, xname, yname));
const BoxView = DomView.build(BoxVM, $(`
  <div>
    <div class="resizable"/>
    <div class="handle h-x1-y1"/>
    <div class="handle h-x1-y2"/>
    <div class="handle h-x2-y1"/>
    <div class="handle h-x2-y2"/>
  </div>`), template(
  find('.resizable')
    .css('left', from.vm('xmin').map(pct))
    .css('top', from.vm('ymin').map(pct))
    .css('width', from.vm('width').map(pct))
    .css('height', from.vm('height').map(pct)),
  handle('x1', 'y1'),
  handle('x1', 'y2'),
  handle('x2', 'y1'),
  handle('x2', 'y2')
));

const app = new App();
stdlib.view($).registerWith(app.views);
app.views.register(Workspace, WorkspaceView);
app.views.register(Box, BoxView);

const box = new Box({ x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.8 });
const workspace = new Workspace({ box });
const view = app.view(workspace);
view.wireEvents();

const inspected = new Varying();
return [ view, inspect.panel(box), inspected.map(inspect.panel) ];
~~~

~~~ styles
.resizable {
  border: 1px dashed #333;
  position: absolute;
}
.handle {
  background: #fff;
  border: 1px solid #333;
  height: 0.6em;
  margin-left: -0.3em;
  position: absolute;
  margin-top: -0.3em;
  width: 0.6em;
}
~~~

So without changing our Drag machine at all, we can implement a _resizable_ box
by dragging the four corners. There are actually only two coördinates defining
the box; the other two handles are invented by recombining the two.

There are a lot of repetitive lives here, just to handle the different possible
corners, but hopefully with what you saw earlier you can reason easily about what
this sample is doing.

