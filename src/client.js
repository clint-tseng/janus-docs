window.$ = require('jquery');
const { mutators } = require('janus');
const { baseApp } = require('./base');

const { Tocs } = require('./model/toc');
const { Article } = require('./model/article');

window.init = (tocData, articleData) => {
  const path = window.location.pathname;
  const app = baseApp(path);

  app.set('toc', Tocs.deserialize(tocData))
  app.cacheArticle(path, Article.deserialize(articleData));

  // TODO: when we have .attach() use that instead of clobbering.
  app.view(app).wireEvents();
};

