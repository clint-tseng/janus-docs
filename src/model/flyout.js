const { Model, attribute, bind, from, List } = require('janus');
const { sticky, fromEvents } = require('janus-stdlib').varying;

// TODO: once Model.build() x2 is unbroken for ES6 (see janus#150) we can have the
// two Flyout types inherit from a common ancestor to solve some typing issues
// elsewhere and add methods like addChild(flyout) without hating it.

// there are two flyout classes. manual flyouts only close when a button is
// clicked. hover flyouts, which are more commonly used, close when the mouse
// has left areas of interest (the original trigger, the flyout, and its
// descendants) for a small length of time.

// add ourselves to our trigger's flyout parent to prevent its destruction.
const addToParent = (flyout) => {
  const parentDom = flyout.get_('trigger').closest('.flyout');
  if (parentDom.length > 0)
    parentDom.view().subject.get_('children').add(flyout);
};


// manual flyouts don't have much to do.
class ManualFlyout extends Model.build(
  attribute('children', attribute.List.withDefault())
) {
  _initialize() {
    this.destroyWith(this.get_('target'));
    addToParent(this);
  }
}

// hover flyouts have to track hovers.
class HoverFlyout extends Model.build(
  attribute('children', attribute.List.withDefault()),

  bind('hover.trigger', from('trigger').flatMap((trigger) =>
    fromEvents(trigger, true, { mouseenter: true, mouseleave: false }))),

  bind('active.target', from('hover.target').pipe(sticky({ true: 300 }))),
  bind('active.trigger', from('hover.trigger').pipe(sticky({ true: 300 }))),
  bind('active.children', from('children').flatMap((children) => children.nonEmpty())),
  bind('active.net', from('active.target').and('active.trigger').and('active.children')
    .all.map((x, y, z) => x || y || z))
) {
  _initialize() {
    // first, destroy ourselves if our subject is, or we're ever not active.
    this.destroyWith(this.get_('target'));
    this.reactTo(this.get('active.net'), false, (active) => {
      if (!active) this.destroy();
    });

    // and then add ourselves onto our flyout parent.
    addToParent(this);
  }
}


module.exports = {
  Flyout: {
    manual: ManualFlyout,
    Manual: ManualFlyout,
    hover: HoverFlyout,
    Hover: HoverFlyout
  }
};

