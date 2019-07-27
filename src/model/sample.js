const janus = require('janus');
const { Model, attribute, List, bind, from, DomView, App, Library } = janus;
const stdlib = require('janus-stdlib');
const { inspect } = require('../util/inspect');
const { compile, success, fail, inert, Env } = require('../util/eval');


////////////////////////////////////////
// UTIL

// create a reasonable base app for samples to use:
const views = new Library();
stdlib.view($).registerWith(views);
const app = new App({ views });

// doing nothing as a happy result.
const noop = (x) => success(x);

// replicate jQuery's own markup-detection logic here (see core/init in
// jquery/jquery) to decide how to route $ calls when shimmed.
const rQuickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
const isMarkup = (selector) => {
  if (typeof selector !== 'string') return false;
  if ((selector[0] === '<') && (selector[selector.length - 1] === '>') && (selector.length >= 3))
    return true;
  const match = rQuickExpr.exec(selector);
  return ((match != null) && (match[1] != null));
};

// quick and dirty view that simply hosts an fragment instance.
const htmlView = (html) => {
  if (html == null) return null;
  class HtmlView extends DomView { _render() { return $(html); } }
  return new HtmlView();
};


////////////////////////////////////////////////////////////////////////////////
// SAMPLE MODEL,
// which handles the actual inteprertation of sample code.
class Sample extends Model.build(
  attribute('main', attribute.Text),

  ////////////////////////////////////////////////////////////////////////////////
  // EVAL ENV
  // here we set up a bunch of the env inputs and outputs surrounding the actual
  // code sample itself:

  // if there is a custom dom target, we need to create a mock view with the
  // specified html to render. otherwise ignore. we need to be able to reset with
  // each execution so appends don't stack.
  //
  // get a new view to plumb through every time the main code changes, since we
  // need to reset to a clean state after any mutations.
  bind('env.view', from('target-html').and('main').all.map(htmlView)),

  // if there is a custom dom target, we have to do some work to make it work
  // transparently to the code sample:
  bind('env.dollar', from('env.view').map((view) => (view == null)
    ? $
    : ((selector) => isMarkup(selector)
      ? $(selector)
      : view.artifact().filter(selector).add(view.artifact().find(selector))))),

  // some samples want to define magic handwavy functions without having to expose
  // the source; returning an object from env-additions adds those members to the
  // local space.
  bind('env.additions', from('env-additions').map((code) =>
    compile(janus, code).flatMap((f) => f().successOrElse({})))),

  // our default env is simply everything janus provides, plus $:
  bind('env.default', from('env.dollar').and('env.additions').all.map(($, additions) =>
    new Env({ $, stdlib, inspect, app }, janus, additions))),

  // but if the code block has custom require()s in it instead, we need to provide
  // require(), along with shims to bridge $.
  bind('env.final', from('env.default').and('manual-require').all.map((env, manual) => {
    if (manual !== true) return env;
    else return {
      require: (target) => {
        if (target === 'jquery') return env.$;
        else if ((target === 'janus') || (target === 'janus-stdlib')) return require(target);
      }
    };
  })),

  ////////////////////////////////////////////////////////////////////////////////
  // EVAL EXEC
  // actual compilation and computation of the final code block:

  bind('compiled', from('env.final').and('main').all.map(compile)),
  bind('result.raw', from('compiled').flatMap((proc) => proc.flatMap((f) => f()))),

  // apply noexec and inspect flags.
  bind('result.final', from('result.raw').and('noexec').and('inspect')
    .all.flatMap((result, noexec, inspectWith) =>
      (noexec === true) ? inert() :
      (inspectWith === 'entity') ? result.mapSuccess(inspect) :
      (inspectWith === 'panel') ? result.flatMap((x) => success(inspect.panel(x))) :
      result))
) {
  _initialize() {
    this.set('initial', this.get_('main'));
  }
};

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

