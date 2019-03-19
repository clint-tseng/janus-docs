const { DomView, template, find, from, Model, bind, Map, Varying } = require('janus');
const { fromEvent } = require('janus-stdlib').varying;
const $ = require('janus-dollar');
const { XRay } = require('../model/xray');
const { inspect } = require('../util/inspect');
const { identity } = require('../util/util');

const px = (x) => `${x}px`;
const cache = new WeakMap();

const XRayEntry = Model.build(
  bind('selected', from('selection').flatMap(identity).and('view')
    .all.map((x, y) => x === y))
);
class XRayEntryView extends DomView.build($(`
  <div class="xray-entry">
    <div class="xray-entities">
      <div class="xray-entity xray-view"/>
      <div class="xray-entity xray-subject"/>
    </div>
  </div>`), template(
  find('.xray-entry')
    .classed('selected', from('selected'))

    .classed('tall', from('size.height').map((x) => x > 100))

    .css('left', from('offset.left').map(px))
    .css('top', from('offset.top').map(px))
    .css('width', from('size.width').map(px))
    .css('height', from('size.height').map(px)),

  find('.xray-view').render(from('view').map(inspect)),
  find('.xray-subject').render(from('view').map((view) => inspect(view.subject)))
)) {
  _wireEvents() {
    const subject = this.subject;
    const target = subject.get_('view');
    const targetDom = target.artifact();
    const resize = () => {
      if (cache.has(targetDom)) {
        subject.set(cache.get(targetDom));
      } else {
        const layout = { offset: targetDom.offset(),
          size: { width: targetDom.width(), height: targetDom.height() } };
        subject.set(layout);
        cache.set(targetDom, layout);
      }
    };

    const layout = fromEvent(targetDom.parents(), 'scroll', ({ timeStamp }) => timeStamp);
    this.reactTo(layout, _ => {
      cache.delete(targetDom);
      resize();
    });
  }
}

class XRayView extends DomView.build($(`
  <div class="xray">
    <div class="xray-chrome"><label>X-Ray</label></div>
    <div class="xray-stack"/>
  </div>`), template(
  find('.xray-stack')
    .render(from('stack').and('sizing').and('select.view').asVarying().all.map((stack, sizing, selection) =>
      stack.map((view) => new XRayEntry({ view, sizing, selection }))))
    .criteria({ wrap: false })
)) {
  _wireEvents() {
    const dom = this.artifact();
    const xray = this.subject;
    const vm = this.vm;
    const body = $(document.body);

    this.listenTo(body, 'mouseover', (event) => { xray.set('dom', $(event.target).view()); });
    this.listenTo(body, 'click', (event) => { xray.set('result', xray.get_('select.view')); });

    this.listenTo(body, 'keypress', (event) => {
      if ((event.which === 91) || (event.which === 44)) xray.stepIn(); // [ ,
      if ((event.which === 93) || (event.which === 46)) xray.stepOut(); // ] .
      if (event.which === 27) xray.destroy(); // esc
    });

    this.destroyWith(xray);
  }
}

module.exports = {
  XRayEntry, XRayEntryView,
  XRayView,
  registerWith(library) {
    library.register(XRayEntry, XRayEntryView);
    library.register(XRay, XRayView);
  }
}

