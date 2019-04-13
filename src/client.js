window.$ = require('janus-dollar');
const { mutators } = require('janus');
const { baseApp } = require('./base');

const { Tocs } = require('./model/toc');
const { Article } = require('./model/article');

const { think } = require('./view/thinker');

// some jquery utilities, like this was 2009.
$.fn.view = function() {
  let ptr = this;
  while (ptr.length > 0) {
    const view = ptr.data('view')
    if (view != null) return view;
    ptr = ptr.parent();
  }
};

$.fn.offsetCenter = function() {
  const offset = this.offset();
  offset.top += (this.height() / 2);
  offset.left += (this.width() / 2);
  return offset;
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

