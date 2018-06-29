// Bundles all application assets together into a Janus App for dual purpose
// use by the static site renderer and the live client renderer.

const getApp = () => {
  const { App, Library } = require('janus').application;
  const stdlib = require('janus-stdlib');

  const views = new Library();
  stdlib.view.registerWith(views);
  require('./view/article').registerWith(views);
  require('./view/sample').registerWith(views);
  require('./view/view').registerWith(views);
  require('./view/exception').registerWith(views);

  if (window && window.navigator) {
    require('./view/editor').registerWith(views);
  } else {
  }

  return new App({ views });
};

module.exports = { getApp };

