const { DomView, template, find, from } = require('janus');
const { filter } = require('janus-stdlib').varying;
const { exists } = require('../util/util');
const { App } = require('../model/app');
const $ = require('janus-dollar');

class AppView extends DomView.build($('body').clone(), template(
  find('#left nav').render(from('toc')),
  find('#main').render(from('article').pipe(filter(exists)))
)) {
  dom() { return $('body'); }

  _wireEvents() {
    const dom = this.artifact();
    const app = this.subject;

    dom.on('click', 'a', (event) => {
      if (event.isDefaultPrevented()) return;
      if (event.target.host !== location.host) return;

      event.preventDefault();
      const path = event.target.pathname;
      window.history.pushState({ path }, '', path);
      app.set('path', path);
    });

    $(window).on('popstate', (event) => {
      app.set('path', event.originalEvent.state.path);
    });
  }
}

module.exports = {
  AppView,
  registerWith: (library) => library.register(App, AppView)
};

