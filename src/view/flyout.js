const { DomView, find, from } = require('janus');
const $ = require('janus-dollar');

const { Flyout } = require('../model/flyout');
const { positionFlyout } = require('../util/dom.js');


class FlyoutView extends DomView.build(
  $('<div class="flyout"/>'),
  find('.flyout')
    .render(from('target')).context(from('context'))
    .on('mouseenter', (_, subject) => { subject.set('hover.target', true); })
    .on('mouseleave', (_, subject) => { subject.set('hover.target', false); })
) {
  _wireEvents() {
    // we do this here instead of _render because here we are guaranteed to be
    // attached to the document, which we need in order to measure ourselves.
    positionFlyout(this.subject.get_('trigger'), this.artifact());
  }
}

module.exports = {
  FlyoutView,
  registerWith: (library) => { library.register(Flyout, FlyoutView) }
};

