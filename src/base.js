// Bundles all application assets together into a Janus App for dual purpose
// used by the static site renderer and the live client renderer.

const { Library } = require('janus');
const stdlib = require('janus-stdlib');
const inspect = require('janus-inspect');

const baseViews = () => {
  const views = new Library();
  stdlib.view.registerWith(views);
  inspect.view.registerWith(views);
  require('./view/app').registerWith(views);
  require('./view/article').registerWith(views);
  require('./view/context').registerWith(views);
  require('./view/exception').registerWith(views);
  require('./view/repl').registerWith(views);
  require('./view/sample').registerWith(views);
  require('./view/toc').registerWith(views);
  require('./view/view').registerWith(views);

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

const baseApp = (path) => {
  const { App } = require('./model/app');
  return new App({ path, resolvers: baseResolvers(), views: baseViews() });
};

module.exports = { baseViews, baseResolvers, baseApp };

