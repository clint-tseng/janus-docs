const { min } = Math;
const { DomView, find, from } = require('janus');
const $ = require('janus-dollar');

const { Flyout } = require('../model/flyout');


class FlyoutView extends DomView.build(
  $('<div class="flyout"/>'),
  find('.flyout')
    .render(from('target')).context(from('context'))
    .on('mouseenter', (_, subject) => { subject.set('hover.target', true); })
    .on('mouseleave', (_, subject) => { subject.set('hover.target', false); })
) {
  _wireEvents() {
    // position ourselves on screen. we do this here instead of _render because
    // here we are guaranteed to be attached to the document, which we need in
    // order to measure ourselves.
    const dom = this.artifact();
    const trigger = this.subject.get_('trigger');
    const margin = 20; //px

    const offset = trigger.offset();
    const bottomEdge = window.scrollY + window.innerHeight;
    const domWidth = dom.width();
    const domHeight = dom.height();
    const naiveTop = offset.top + trigger.outerHeight();
    if ((naiveTop + domHeight) > (bottomEdge - margin)) {
      dom.css('top', bottomEdge - margin - domHeight);
      const triggerWidth = trigger.outerWidth();
      const squirtRight = offset.left + triggerWidth;
      if ((squirtRight + domWidth) > (window.innerWidth - margin))
        dom.css('left', offset.left - domWidth);
      else
        dom.css('left', squirtRight);
    } else {
      dom.css('top', naiveTop);
      dom.css('left', min(offset.left, $(window).width() - dom.outerWidth() - margin));
    }
  }
}


module.exports = {
  FlyoutView,
  registerWith: (library) => { library.register(Flyout, FlyoutView) }
};

