const { DomView, template, find, from } = require('janus');
const { filter } = require('janus-stdlib').varying;
const { exists } = require('../util/util');
const { App } = require('../model/app');
const $ = require('janus-dollar');

class AppView extends DomView.build($('body').clone(), template(
  find('#left nav').render(from('toc')),
  find('#main').render(from('article').pipe(filter(exists))),

  find('#repl')
    .render(from('repl'))
    .classed('active', from('active.repl')),

  find('#flyouts').render(from('flyouts'))
)) {
  dom() { return $('body'); }

  _wireEvents() {
    const dom = this.artifact();
    const app = this.subject;

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


    ////////////////////////////////////////
    // HEADER EVENTS

    dom.find('#repl-link').on('click', (event) => {
      event.preventDefault();
      const active = !app.get_('active.repl');
      app.set('active.repl', active);
      if (active)
        dom.find('#repl .repl').data('view').focusLast();
      dom.find('#repl').addClass('activated');
    });

    dom.find('#show-toc').on('click', (event) => {
      event.preventDefault();
      dom.toggleClass('show-toc');
    });
  }
}

module.exports = {
  AppView,
  registerWith: (library) => library.register(App, AppView)
};

