const { Varying } = require('janus');
const $ = require('janus-dollar');

// TODO: it's possible this is functionality we want in inspect, and that we'd rather
// duplicate this behavior across all the disparate inspector classes (right now they
// have no superclass/superbehaviour at all) than splice in something from a central
// spot like this. but this makes initial experimentation far easier so yes for now.

const highlight = (app) => {
  const cache = new WeakMap();

  app.on('inspected', (view, target) => {
    let tracker = cache.get(target); // ugh js
    if (tracker == null) cache.set(target, (tracker = new Varying(0)));
    view.reactTo(tracker, (hover) => { view.artifact().toggleClass('highlight', hover > 0); });
  });

  $('body').on('mouseover', '.janus-inspect-entity, .janus-inspect-panel', (event) => {
    const dom = $(event.currentTarget);
    const target = dom.view().subject.get_('target');
    const tracker = cache.get(target);
    if (tracker != null) {
      event.stopPropagation(); // TODO: maybe a lighter-touch solution?
      tracker.set(tracker.get() + 1);
      dom.one('mouseout', _ => { tracker.set(tracker.get() - 1); });
    }
  });
};

module.exports = { highlight };

