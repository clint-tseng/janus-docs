const { DomView, template, find, from } = require('janus');
const { filter } = require('janus-stdlib').varying;
const { exists } = require('../util/util');
const { App } = require('../model/app');
const { asPanel } = require('./context');
const $ = require('janus-dollar');

class AppView extends DomView.build($('body').clone(), template(
  find('#left nav').render(from('toc')),
  find('#main').render(from('article').pipe(filter(exists))),

  find('#repl')
    .render(from('repl.obj'))
    .classed('active', from('repl.active'))
    .classed('activated', from('repl.activated')),

  find('#flyouts').render(from('flyouts'))
)) {
  dom() { return $('body'); }

  _wireEvents() {
    const dom = this.artifact();
    const app = this.subject;
    const repl = app.get_('repl.obj');
    const pins = repl.get_('pins');

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

    // highlight code samples:

    dom.on('click', 'code', (event) => {
      if (window.getSelection == null) return;
      const selection = window.getSelection();
      if (selection.isCollapsed === true)
        selection.selectAllChildren(event.target);
    });

    // inspector events:

    dom.on('mouseenter', '.entity-title', (event) => {
      const trigger = $(event.target);
      const timer = setTimeout(_ => {
        const target = trigger.closest('.janus-inspect-entity').data('view').subject;
        app.flyout(trigger, target, 'panel');
      }, 300);
      trigger.one('mouseleave', _ => { clearTimeout(timer); });
    });

    dom.on('click', '.janus-inspect-pin', (event) => {
      const trigger = $(event.target);
      const panelSubject = trigger.closest('.janus-inspect-panel').data('view').subject;
      // TODO: this is sort of messy ;/
      const target = panelSubject.isInspector ? panelSubject : panelSubject.get_('subject');
      pins.add(asPanel(target));
      app.showRepl();
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
      if (active) dom.find('#repl .repl').data('view').focusLast();
    });
  }
}

module.exports = {
  AppView,
  registerWith: (library) => library.register(App, AppView)
};

