const { App, Varying, attribute, bind, dēfault, types, from, Request, Resolver, List } = require('janus');
const { filter } = require('janus-stdlib').varying
const { compile, fail } = require('../util/eval');
const { Article } = require('./article');
const { Flyout } = require('./flyout');
const { Sheet } = require('./sheet');
const { Repl } = require('./repl');
const { Valuator } = require('./valuator');
const { XRay } = require('./xray');


class GlobalList extends attribute.List.withDefault() {
  get shadow() { return false; }
}

class DocsApp extends App.build(
  attribute('article', attribute.Reference.to(
    from('path').map((path) => new ArticleRequest(path)))
  ),
  attribute('flyouts', GlobalList),
  attribute('sheets', GlobalList),

  dēfault.writing('cache.articles', []),
  dēfault.writing('repl.obj', new Repl()),
  dēfault.writing('eval.env', {}),

  bind('repl.activated', from('repl.active').pipe(filter((x) => x === true)))
) {
  _initialize() {
    // TODO: this is sort of messy and i don't really like it but somehow we have
    // to track one stream of these events regardless of app shadowing.
    this.listenTo(this, 'createdView', (view) => {
      // emit an event if we have an inspector, on the original root app.
      if (typeof view.highlight === 'function')
        this.original().emit('inspected', view, view.highlight());
    });
  }

  ////////////////////////////////////////////////////////////////////////////////
  // RESOLVER / REQUEST

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

  ////////////////////////////////////////////////////////////////////////////////
  // APP UI / INTEROP

  flyout(trigger, target, { context = 'default', type = 'Hover' } = {}) {
    const triggerNode = trigger[0];
    const flyouts = this.get_('flyouts');
    for (const flyout of flyouts) // don't retrigger the same flyout twice.
      if (flyout.get_('trigger')[0] === triggerNode)
        return;

    const flyout = new Flyout[type]({ trigger, target, context });
    flyouts.add(flyout);
    return flyout;
  }

  sheet(title, target) {
    const sheet = new Sheet({ title, target });
    this.get_('sheets').add(sheet);
    return sheet;
  }

  xray(callback) {
    const xray = new XRay();
    this.set('xray', xray);
    xray.get('result').react(false, (result) => {
      callback(result);
      xray.destroy();
      this.showRepl();
    });
    return xray;
  }
  flash(target) {
    const flash = new XRay.Flash({ target });
    this.set('xray', flash); // TODO: maybe don't replace the xray?
    return flash;
  }

  showRepl() { this.set('repl.active', true); }
  hideRepl() { this.set('repl.active', false); }
  toggleRepl() { this.set('repl.active', !this.get_('repl.active')); }

  ////////////////////////////////////////////////////////////////////////////////
  // EVAL INTEROP

  valuator(trigger, { title, values = [], initial }, callback) {
    const env = { inject: this.get_('eval.env') };
    const valuator = new Valuator({ title, values, initial, env });
    const flyout = this.flyout(trigger, valuator, { context: 'quick', type: 'Manual' });
    valuator.destroyWith(flyout);

    valuator.get('result').react(false, (result) => { // no point in reactTo
      callback(result);
      valuator.destroy();
    });
    return valuator;
  }

  // TODO: rm? this was here for contextless evaluation in j-i which no longer exists
  evaluate(expr) {
    const result = compile(this.get_('eval.env'), expr).flatMap((f) => f());
    if (fail.match(result)) throw result.get();
    else return result.get();
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

