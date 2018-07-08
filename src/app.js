// Bundles all application assets together into a Janus App for dual purpose
// used by the static site renderer and the live client renderer.

const { App, Library } = require('janus').application;
const stdlib = require('janus-stdlib');

const baseViews = () => {
  const views = new Library();
  stdlib.view.registerWith(views);
  require('./view/article').registerWith(views);
  require('./view/exception').registerWith(views);
  require('./view/sample').registerWith(views);
  require('./view/toc').registerWith(views);
  require('./view/view').registerWith(views);

  if (window && window.navigator) {
    require('./view/editor').registerWith(views);
  } else {
    require('./view/code').registerWith(views);
  }

  return views;
};

const baseApp = (path) => {
  return new App({ path, views: baseViews() });
};

module.exports = { baseViews, baseApp };

