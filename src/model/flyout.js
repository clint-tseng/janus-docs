const { Model, attribute, bind, from, List } = require('janus');
const { sticky, fromEvents } = require('janus-stdlib').varying;

class Flyout extends Model.build(
  attribute('children', class extends attribute.List {
    default() { return new List(); }
  }),

  bind('hover.trigger', from('trigger').flatMap((trigger) =>
    fromEvents(trigger, true, { mouseenter: true, mouseleave: false }))),

  bind('active.target', from('hover.target').pipe(sticky({ true: 300 }))),
  bind('active.trigger', from('hover.trigger').pipe(sticky({ true: 300 }))),
  bind('active.children', from('children').flatMap((children) => children.nonEmpty())),
  bind('active.net', from('active.target').and('active.trigger').and('active.children')
    .all.map((x, y, z) => x || y || z))
) {
  _initialize() {
    // first, destroy ourselves if we're ever not active.
    this.reactTo(this.get('active.net'), false, (active) => {
      if (!active) this.destroy();
    });

    // then, add ourselves to our parent to prevent its destruction.
    const parentDom = this.get_('trigger').closest('.flyout');
    if (parentDom.length > 0)
      parentDom.data('view').subject.get_('children').add(this);
  }
}

module.exports = { Flyout };

