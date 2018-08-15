const { App, Varying, attribute, dēfault, types, from, Request, Resolver } = require('janus');
const { Article } = require('./article');
const { Repl } = require('./repl');

class DocsApp extends App.build(
  attribute('article', attribute.Reference.to(
    from('path').map((path) => new ArticleRequest(path)))
  ),

  dēfault.writing('cache.articles', []),
  dēfault.writing('repl', new Repl())
) {
  resolver() {
    return Resolver.caching(new Resolver.MemoryCache(),
      Resolver.oneOf(this.articleCache(), Resolver.fromLibrary(this.get('resolvers'))));
  }

  cacheArticle(path, article) {
    this.get('cache.articles').push({ path, article });
  }

  articleCache() {
    return (request) => {
      for (const cached of this.get('cache.articles'))
        if (request.path === cached.path)
          return new Varying(types.result.success(cached.article.shadow()));
    };
  }
}

class ArticleRequest extends Request {
  constructor(path) {
    super();
    this.path = path;
  }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

module.exports = {
  App: DocsApp,
  registerWith: (library) => { library.register(ArticleRequest, articleResolver); }
};

