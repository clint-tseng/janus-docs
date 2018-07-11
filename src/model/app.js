const { attribute, types } = require('janus');
const { Request, Store, OneOfStore, MemoryCacheStore } = require('janus').store;
const { uniqueId } = require('janus').util;
const { App } = require('janus').application;
const { Article } = require('./article');

class DocsApp extends App.build(
  attribute('article', class extends attribute.Reference {
    request() { return this.model.watch('path').map((path) => new ArticleRequest(path)); }
    static deserialize(data) {
      // all we want to do, since we already have Article instances, is to reset
      // samples so they run again.
      for (const sample of data.get('samples').list)
        sample.set('reset', uniqueId());
      return data;
    }
  })
) {
  _initialize() {
    this._caches = [ new MemoryCacheStore() ];
  }

  cacheArticle(path, article) {
    this._caches.push(new ArticleCache(path, article));
  }

  vendStore(request, options) {
    // inject our cache stores in front of the actual fulfillment store.
    const store = super.vendStore(request, options);
    return new OneOfStore(request, this._caches.concat([ store ]));
  }
}

class ArticleRequest extends Request {
  constructor(path) {
    super();
    this._path = path;
  }
  signature() { return this._path; }
}

class ArticleStore extends Store {
  _handle() {
    this.request.set(types.result.pending());
    const path = (this.request._path === '/') ? '/index.json' : `${this.request._path}.json`;
    $.getJSON(path)
      .done((result) => { this.request.set(types.result.success(Article.deserialize(result))) })
      .fail((error) => { this.request.set(types.result.failure(error)) });
    return types.handling.handled();
  }
}

class ArticleCache extends Store {
  constructor(path, article) {
    super();
    this._path = path;
    this._article = article;
  }
  handle(request) {
    if ((request._path === this._path) || (request._path === '/' && this._path === '/')) {
      request.set(types.result.success(this._article));
      return types.handling.handled();
    } else {
      return types.handling.unhandled();
    }
  }
}

module.exports = {
  App: DocsApp,
  registerWith: (library) => { library.register(ArticleRequest, ArticleStore); }
};

