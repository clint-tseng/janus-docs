window.$ = require('janus-dollar');
const { mutators } = require('janus');
const { baseApp } = require('./base');

const { Tocs } = require('./model/toc');
const { Article } = require('./model/article');

const { think } = require('./view/thinker');

$.fn.view = function() {
  let ptr = this;
  while (ptr.length > 0) {
    const view = ptr.data('view')
    if (view != null) return view;
    ptr = ptr.parent();
  }
};

window.init = (tocData, apiData, articleData) => {
  const path = window.location.pathname;
  const app = baseApp(path, apiData);
  window.app = app;

  app.set('toc', Tocs.deserialize(tocData));
  app.cacheArticle(path, Article.deserialize(articleData));

  const appView = app.view(app);
  appView.attach($('body'));
  appView.wireEvents();

  // wire up the thinker.
  app.on('resolvedRequest', (_, thought) => { think(thought); });
};

