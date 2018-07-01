window.$ = require('jquery');
const { baseApp } = require('./app');

const { Article } = require('./model/article');
window.init = (tocData, articleData) => {
  // TODO: when we have .attach() use that instead of clobbering.
  const app = baseApp();
  const article = Article.deserialize(articleData);
  const articleView = app.vendView(article);
  $('#main').empty().append(articleView.artifact());
  articleView.wireEvents();
};

