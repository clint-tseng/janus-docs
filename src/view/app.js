const { DomView, template, find, from } = require('janus');
const { filter } = require('janus-stdlib').varying;
const { exists, blank } = require('../util/util');
const { highlight } = require('./highlighter');
const { positionFlyout } = require('../util/dom');
const { App } = require('../model/app');
const { Repl } = require('../model/repl');
const { asPanel } = require('./context');
const $ = require('janus-dollar');

class AppView extends DomView.build($('body').clone(), template(
  find('#left nav').render(from('toc')),
  find('#main').render(from('article').pipe(filter(exists))),

  find('#repl')
    .render(from('repl.obj'))
    .classed('active', from('repl.active'))
    .classed('activated', from('repl.activated')),

  find('#flyouts').render(from('flyouts')),
  find('#sheets').render(from('sheets')),
  find('#xray').render(from('xray'))
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
      if (event.target.host !== location.host) return;
      if (event.ctrlKey || event.shiftKey || event.metaKey) return;

      const { pathname, hash } = event.target;
      if (pathname !== location.pathname) { // navigating to different page
        event.preventDefault();
      } else if (hash === '') { // navigating from #anchor to same-page
        event.preventDefault();
        window.scrollTo(0, 0); // TODO: this clobbers scroll history :( :( :(
      }

      window.history.pushState(null, '', pathname + hash);
      app.set('path', pathname);
    });

    $(window).on('popstate', (event) => {
      app.set('path', location.pathname);
    });

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
      const timer = setTimeout(_ => {
        const target = trigger.closest('.janus-inspect-entity').view().subject;
        app.flyout(trigger, target, 'panel');
      }, 300);
      trigger.one('mouseleave', _ => { clearTimeout(timer); });
    });

    dom.on('mouseenter', '.varying-node', (event) => {
      const node = $(event.currentTarget);
      const timer = setTimeout(_ => { app.flyout(node, node.view().subject, 'panel'); }, 300);
      node.one('mouseleave', _ => { clearTimeout(timer); });
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

