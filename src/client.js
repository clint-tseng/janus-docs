window.$ = require('jquery');
const { getApp } = require('./app');

const { Article } = require('./model/article');
window.init = (tocData, articleData) => {
  // TODO: when we have .attach() use that instead of clobbering.
  const app = getApp();
  const article = Article.deserialize(articleData);
  const articleView = app.vendView(article);
  $('#main').empty().append(articleView.artifact());
  articleView.wireEvents();
};

