const { App, Varying, attribute, dēfault, types, from, Request, Resolver, List } = require('janus');
const { Article } = require('./article');
const { Flyout } = require('./flyout');
const { Repl } = require('./repl');

class DocsApp extends App.build(
  attribute('article', attribute.Reference.to(
    from('path').map((path) => new ArticleRequest(path)))
  ),
  attribute('flyouts', class extends attribute.List {
    default() { return new List(); }
  }),

  dēfault.writing('cache.articles', []),
  dēfault.writing('repl', new Repl())
) {
  resolver() {
    return Resolver.caching(new Resolver.MemoryCache(),
      Resolver.oneOf(this.articleCache(), Resolver.fromLibrary(this.resolvers)));
  }

  cacheArticle(path, article) {
    this.get_('cache.articles').push({ path, article });
  }

  articleCache() {
    return (request) => {
      for (const cached of this.get_('cache.articles'))
        if (request.path === cached.path)
          return new Varying(types.result.success(cached.article.shadow()));
    };
  }

  flyout(trigger, target, context = 'default') {
    const triggerNode = trigger[0];
    const flyouts = this.get_('flyouts');
    for (const flyout of flyouts)
      if (flyout.get_('trigger')[0] === triggerNode)
        return;

    flyouts.add(new Flyout({ trigger, target, context }));
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

