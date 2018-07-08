window.$ = require('jquery');
const { baseApp } = require('./app');

const { Tocs } = require('./model/toc');
const { Article } = require('./model/article');

window.init = (tocData, articleData) => {
  const app = baseApp(location.pathname);

  // TODO: when we have .attach() use that instead of clobbering.
  const toc = Tocs.deserialize(tocData);
  const tocView = app.vendView(toc);
  $('#left nav').empty().append(tocView.artifact());
  tocView.wireEvents();

  const article = Article.deserialize(articleData);
  const articleView = app.vendView(article);
  $('#main').empty().append(articleView.artifact());
  articleView.wireEvents();
};

