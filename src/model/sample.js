const $ = require('janus-dollar');
const janus = require('janus');
const { Model, attribute, List, bind, from, DomView } = janus;
const stdlib = require('janus-stdlib');
const { inspect } = require('janus-inspect');
const { compile, success, fail, inert } = require('../util/eval');


////////////////////////////////////////
// UTIL

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

// we need env to not be a plain object so that it assigns into Model as a single
// unit. so we make it a simple class.
class Env { constructor(...props) { Object.assign(this, ...props); } };


////////////////////////////////////////////////////////////////////////////////
// SAMPLE MODEL,
// which handles the actual inteprertation of sample code.
const Sample = Model.build(
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

  // our default env is simply everything janus provides, plus $:
  bind('env.default', from('env.dollar').map(($) => new Env({ $, stdlib, inspect }, janus))),

  // but if the code block has custom require()s in it instead, we need to provide
  // require(), along with shims to bridge $.
  bind('env.final', from('env.default').and('manual-require').all.map((env, manual) => {
    if (manual !== true) return env;
    else return {
      require: (target) => {
        if ((target === 'jquery') || (target === 'janus-dollar')) return env.$;
        else if ((target === 'janus') || (target === 'janus-stdlib')) return require(target);
      }
    };
  })),

  ////////////////////////////////////////////////////////////////////////////////
  // EVAL EXEC
  // actual compilation and computation of the final code block:

  bind('compiled.main', from('env.final').and('main').all.map(compile)),
  bind('compiled.postprocess', from('env.default').and('postprocess').all.map((env, code) =>
    (code == null) ? noop : compile(env, code).successOrElse(noop))),

  bind('result.raw', from('compiled.main').and('compiled.postprocess')
    .all.flatMap((main, post) => main.flatMap((f) => f().flatMap(post)))),

  // TODO: perhaps don't bother with any of this at all if noexec.
  bind('result.final', from('result.raw').and('noexec').all.flatMap((result, noexec) =>
    (noexec === true) ? inert() : result))
);

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

