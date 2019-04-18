// Bundles all application assets together into a Janus App for dual purpose
// used by the static site renderer and the live client renderer.

// for debugging:
if (typeof global !== 'undefined') global.tap = (x) => { console.log(x); return x; };

const { Library } = require('janus');
const stdlib = require('janus-stdlib');
const inspect = require('janus-inspect');

const baseViews = () => {
  const views = new Library();
  stdlib.view.registerWith(views);
  inspect.view.registerWith(views);
  require('./view/api').registerWith(views);
  require('./view/app').registerWith(views);
  require('./view/article').registerWith(views);
  require('./view/confirm').registerWith(views);
  require('./view/context').registerWith(views);
  require('./view/exception').registerWith(views);
  require('./view/flyout').registerWith(views);
  require('./view/repl').registerWith(views);
  require('./view/placeholder').registerWith(views);
  require('./view/sample').registerWith(views);
  require('./view/sheet').registerWith(views);
  require('./view/toc').registerWith(views);
  require('./view/valuator').registerWith(views);
  require('./view/view').registerWith(views);
  require('./view/xray').registerWith(views);

  if (typeof window !== 'undefined') {
    require('./view/editor').registerWith(views);
  } else {
    require('./view/code').registerWith(views);
  }

  return views;
};

const baseResolvers = () => {
  const resolvers = new Library();
  require('./model/app').registerWith(resolvers);
  return resolvers;
};

const baseApp = (path, apiData) => {
  const { App } = require('./model/app');
  const { Api } = require('./model/api');
  return new App({
    path,
    api: Api.deserialize(apiData),
    resolvers: baseResolvers(),
    views: baseViews()
  });
};

module.exports = { baseViews, baseResolvers, baseApp };

