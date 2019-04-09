const { DomView, template, find, from, Model, bind, Map, Varying } = require('janus');
const { fromEvent } = require('janus-stdlib').varying;
const $ = require('janus-dollar');
const { XRay } = require('../model/xray');
const { inspect } = require('../util/inspect');
const { identity } = require('../util/util');


////////////////////////////////////////////////////////////////////////////////
// XRAY ENTRY

const XRayEntry = Model.build(
  bind('idx.delta', from('idx.own').and('idx.selection').flatMap(identity)
    .all.map((x, y) => x - y))
);

////////////////////////////////////////
// ENTRY LIST VIEW

const XRayListView = DomView.build($(`
  <div class="xray-entry">
    <span class="xray-entity xray-view"/>
    <span class="xray-entity xray-subject"/>
    <span class="xray-hint hint-prev">
      <span class="key">[</span> or <span class="key">,</span> to select
    </span>
    <span class="xray-hint hint-sel">
      <span class="key">Enter</span> to inspect
    </span>
    <span class="xray-hint hint-next">
      <span class="key">]</span> or <span class="key">.</span> to select
    </span>
  </div>`), template(
  find('.xray-entry').classGroup('delta', from('idx.delta')),
  find('.xray-view').render(from('view').map(inspect)),
  find('.xray-subject').render(from('view').map((view) => inspect(view.subject, true)))
));

////////////////////////////////////////
// ENTRY BOXED VIEW

const px = (x) => `${x}px`;
const cache = new WeakMap();

class XRayEntryView extends DomView.build($(`
  <div class="xray-entry xray-box">
    <div class="xray-entities">
      <div class="xray-entity xray-view"/>
      <div class="xray-entity xray-subject"/>
    </div>
  </div>`), template(
  find('.xray-entry')
    .classGroup('delta', from('idx.delta'))

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

////////////////////////////////////////////////////////////////////////////////
// XRAY PRIMARY VIEW

const XRayVM = Model.build(
  bind('entries', from.subject('stack').and.subject('sizing').and.subject('select.index').asVarying()
    .all.map((stack, sizing, selection) =>
      stack.mapPairs((own, view) => new XRayEntry({ view, sizing, idx: { own, selection } })))));

class XRayView extends DomView.withOptions({ viewModelClass: XRayVM }).build($(`
  <div class="xray">
    <div class="xray-chrome"><label>X-Ray</label></div>
    <div class="xray-boxes"/>
    <div class="xray-stack"/>
  </div>`), template(
  find('.xray-boxes').render(from.vm('entries')),
  find('.xray-stack').render(from.vm('entries'))
    .options({ renderItem: (r) => r.context('list') })
)) {
  _wireEvents() {
    const dom = this.artifact();
    const xray = this.subject;
    const body = $(document.body);

    this.listenTo(body, 'mouseover', (event) => { xray.set('dom', $(event.target).view()); });
    this.listenTo(body, 'keypress', (event) => {
      if (event.which === 13) {
        xray.set('result', xray.get_('select.view')); // enter
        event.preventDefault();
      }
      if ((event.which === 91) || (event.which === 44)) xray.stepIn(); // [ ,
      else if ((event.which === 93) || (event.which === 46)) xray.stepOut(); // ] .
      else if (event.which === 27) xray.destroy(); // esc
    });

    this.destroyWith(xray);
  }
}

////////////////////////////////////////
// FLASH SIMPLIFIED VIEW

class FlashView extends DomView.withOptions({ viewModelClass: XRayVM }).build(
  $(`<div class="xray flash"><div class="xray-boxes"/></div>`),
  XRayView.template
) {
  _initialize() { this.destroyWith(this.subject); }
}

module.exports = {
  XRayEntry, XRayEntryView,
  XRayView,
  registerWith(library) {
    library.register(XRayEntry, XRayEntryView);
    library.register(XRayEntry, XRayListView, { context: 'list' });
    library.register(XRay, XRayView);
    library.register(XRay.Flash, FlashView);
  }
}

