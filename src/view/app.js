const { DomView, template, find, from } = require('janus');
const { filter } = require('janus-stdlib').varying;
const { exists, blank, nonblank, debounce } = require('../util/util');
const { highlight } = require('./highlighter');
const { positionFlyout } = require('../util/dom');
const { App } = require('../model/app');
const { Repl } = require('../model/repl');
const { asPanel } = require('./context');
const $ = require('janus-dollar');


////////////////////////////////////////////////////////////////////////////////
// SCROLL MANAGEMENT

if ((typeof window !== 'undefined') && ('scrollRestoration' in window.history))
  window.history.scrollRestoration = 'manual';

const savePosition = () => {
  const path = window.location.pathname + window.location.hash;
  window.history.replaceState({ scroll: window.scrollY }, '', path);
};

const loadPosition = (state = window.history.state) => {
  // first try restoring scrollstate.
  if ((state != null) && (state.scroll != null))
    return window.scrollTo(0, state.scroll);

  // if that fails, scroll to the requested hash location if provided.
  // we have to defer so that samples have a chance to run.
  if (nonblank(window.location.hash) && (window.location.hash !== '#')) {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const anchor = document.getElementById(id);
    if (anchor != null)
      return setTimeout(() => { window.scrollTo(0, $(anchor).offset().top); });
  }

  window.scrollTo(0, 0); // otherwise scroll to top.
};


////////////////////////////////////////////////////////////////////////////////
// APP VIEW

class AppView extends DomView.build($('body').clone(), template(
  find('#left nav').render(from('toc')),
  find('#main').render(from('article').pipe(filter(exists))),

  find('#repl')
    .render(from('repl.obj'))
    .classed('active', from('repl.active'))
    .classed('activated', from('repl.activated')),

  find('#flyouts').render(from('flyouts')),
  find('#sheets').render(from('sheets')),
  find('#xray').render(from('xray')),
  find('#junk').render(from('junk'))
)) {
  dom() { return $('body'); }

  _wireEvents() {
    const dom = this.artifact();
    const app = this.subject;
    const repl = app.get_('repl.obj');
    const pins = repl.get_('pins');

    // set up entity highlighting.
    highlight(app);

    // save off the repl view to our model since there are cases where we need
    // it and it is essentially singleton.
    app.set('repl.view', this.into(Repl).first().get_());

    ////////////////////////////////////////
    // GLOBAL EVENTS

    // page navigation:

    dom.on('click', 'a', (event) => {
      if (event.isDefaultPrevented()) return;
      if (event.ctrlKey || event.shiftKey || event.metaKey) return;

      savePosition(); // save our present scroll position to history.
      const target = event.currentTarget;
      if (target.host !== location.host) return;

      const { pathname, hash } = target;
      if (pathname !== location.pathname) { // navigating to different page
        event.preventDefault();
      } else if (hash === '') { // navigating from #anchor to same-page
        event.preventDefault();
        window.scrollTo(0, 0);
      } else { return; } // navigating onto #anchor on same page

      window.history.pushState(null, '', pathname + hash);
      app.set('path', pathname);
    });

    $(window).on('popstate', (event) => {
      if (app.get_('path') === window.location.pathname)
        loadPosition(event.originalEvent.state);
      else
        app.set('path', window.location.pathname);
    });

    $(window).on('scroll', debounce(180, savePosition));
    app.get('article').react(() => { loadPosition(); });

    // select paragraph-inline code on click:

    dom.on('click', 'code', (event) => {
      if (window.getSelection == null) return;
      const selection = window.getSelection();
      if (selection.isCollapsed === true)
        selection.selectAllChildren(event.target);
    });

    // inspector events:
    // TODO: repetitive.

    dom.on('mouseenter', '.entity-title', (event) => {
      const trigger = $(event.target);
      const entity = trigger.closest('.janus-inspect-entity');
      if (entity.hasClass('no-panel')) return;

      const timer = setTimeout(_ => { app.flyout(trigger, entity.view().subject, { context: 'panel' }); }, 300);
      trigger.one('mouseleave', _ => { clearTimeout(timer); });
    });

    dom.on('mouseenter', '.varying-node', (event) => {
      const node = $(event.currentTarget);
      if (node.parents('.varying-tree').length === 2) return; // is the root node in the panel.
      const timer = setTimeout(_ => { app.flyout(node, node.view().subject, { context: 'panel' }); }, 300);
      node.one('mouseleave', _ => { clearTimeout(timer); });
    });

    dom.on('click', '.janus-inspect-reference', (event) => {
      const target = $(event.target).closest('.janus-inspect-panel').view().subject;
      repl.reference(target);
      app.showRepl();
    });
    dom.on('click', '.janus-inspect-pin', (event) => {
      const target = $(event.target).closest('.janus-inspect-panel').view().subject;
      pins.add(asPanel(target));
      app.showRepl();
    });

    // instant tooltips:

    const tooltip = $('#tooltip');
    dom.on('mouseenter', '[title]', (event) => {
      const target = $(event.currentTarget);
      const text = target.prop('title');
      if (blank(text)) return;
      tooltip.text(text).show();

      const disabled = target.hasClass('disabled') || (target.parents('.disabled').length !== 0);
      tooltip.toggleClass('disabled', disabled);

      positionFlyout(target, tooltip);
      target.prop('title', '');

      target.one('mouseleave click', () => {
        target.prop('title', text);
        tooltip.hide();
      });
    });


    ////////////////////////////////////////
    // HEADER EVENTS

    dom.find('#repl-link').on('click', (event) => {
      event.preventDefault();
      app.toggleRepl();
    });

    dom.find('#show-toc').on('click', (event) => {
      event.preventDefault();
      dom.toggleClass('show-toc');
    });


    ////////////////////////////////////////
    // REPL MANAGEMENT

    this.reactTo(app.get('repl.active'), false, (active) => {
      if (active) app.get_('repl.view').focusLast();
    });
  }
}

module.exports = {
  AppView,
  registerWith: (library) => library.register(App, AppView)
};

