window.$ = require('jquery');
const { mutators } = require('janus');
const { baseApp } = require('./base');

const { Tocs } = require('./model/toc');
const { Article } = require('./model/article');

const { think } = require('./view/thinker');

window.init = (tocData, apiData, articleData) => {
  const path = window.location.pathname;
  const app = baseApp(path, apiData);

  app.set('toc', Tocs.deserialize(tocData));
  app.cacheArticle(path, Article.deserialize(articleData));

  const appView = app.view(app);
  appView.attach($('body'));
  appView.wireEvents();

  // wire up the thinker.
  app.on('resolvedRequest', (_, thought) => { think(thought); });
};

