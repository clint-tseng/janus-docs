const { App, Varying, attribute, bind, initial, types, from, Request, Resolver, List } = require('janus');
const { filter } = require('janus-stdlib').varying
const { compile, fail } = require('../util/eval');
const { Article } = require('./article');
const { holdParent, Flyout } = require('./flyout');
const { Placeholder } = require('../view/placeholder');
const { Sheet } = require('./sheet');
const { Repl } = require('./repl');
const { Valuator } = require('./valuator');
const { XRay } = require('./xray');
const { Confirm } = require('../view/confirm');


class GlobalList extends attribute.List.withInitial() {
  get shadow() { return false; }
}

class DocsApp extends App.build(
  attribute('article', attribute.Reference.to(
    from('path').map((path) => new ArticleRequest(path)))
  ),
  attribute('flyouts', GlobalList),
  attribute('sheets', GlobalList),
  attribute('junk', GlobalList),

  initial.writing('cache.articles', []),
  initial.writing('repl.obj', new Repl()),
  initial.writing('eval.env', {}),

  bind('repl.activated', from('repl.active').pipe(filter((x) => x === true)))
) {
  _initialize() {
    this.listenTo(this, 'createdView', (view) => {
      // emit an event if we have an inspector, on the original root app.
      // TODO: this is sort of messy and i don't really like it but somehow we have
      // to track one stream of these events regardless of app shadowing.
      if (typeof view.highlight === 'function') {
        this.original().emit('inspected', view, view.highlight());

        view.artifact().find('.janus-inspect-pin').before(
          '<button class="janus-inspect-reference" title="Reference"/>');
      }
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

  confirm(trigger, message, callback) {
    const confirm = new Confirm({ trigger, message });
    confirm.get('result').react(false, (result) => {
      if (result === true) callback();
      confirm.destroy();
    });
    holdParent(trigger, confirm);
    this.get_('junk').add(confirm);
    return confirm;
  }

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
    this.get_('junk').add(flash);
    return flash;
  }

  placehold(target) {
    const placeholder = new Placeholder({ target });
    if (!holdParent(target, placeholder, true)) return;
    this.get_('junk').add(placeholder);
    return placeholder;
  }

  showRepl() { this.set('repl.active', true); }
  hideRepl() { this.set('repl.active', false); }
  toggleRepl() { this.set('repl.active', !this.get_('repl.active')); }

  ////////////////////////////////////////////////////////////////////////////////
  // EVAL INTEROP

  // OPTIONS: title, values, initial, rider, focus
  valuator(trigger, options, callback) {
    const env = { inject: this.get_('eval.env') };
    const valuator = new Valuator(Object.assign({ trigger, env }, options));
    const flyout = this.flyout(trigger, valuator, { context: 'quick', type: 'Manual' });
    valuator.destroyWith(flyout);
    valuator.on('destroying', () => { this.placehold(trigger); });

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

