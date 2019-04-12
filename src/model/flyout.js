const { Model, attribute, bind, from, List } = require('janus');
const { sticky, fromEvents } = require('janus-stdlib').varying;

// add ourselves to our trigger's flyout parent to prevent its destruction.
const addToParent = (flyout) => {
  const parentDom = flyout.get_('trigger').closest('.flyout');
  if (parentDom.length > 0)
    parentDom.view().subject.get_('children').add(flyout);
};
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
    hover: HoverFlyout,
    Hover: HoverFlyout
  }
};

