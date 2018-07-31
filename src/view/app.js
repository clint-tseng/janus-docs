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
  }
}

module.exports = {
  AppView,
  registerWith: (library) => library.register(App, AppView)
};

