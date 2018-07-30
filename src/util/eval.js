// IMPORTANT! this code makes NO EFFORT to sandbox userland code for security
// purposes. it's not possible to do so, and so we don't even try.

const janus = require('janus');
const { baseViews } = require('../base');
const $ = require('janus-dollar');

const cases = { success, fail } = janus.defcase('org.janusjs.docs.eval', 'success', 'fail');

const inject = `const { ${Object.keys(janus).filter((x) => x !== 'default').join(', ')} } = janus`;
const env = `const { views } = env`;

// special method for success/fail cases which flatMaps successes/fails appropriately.
// TODO: non-hack way to do this.
success().__proto__.flatMap = function(f) { return f(this.value); };
fail().__proto__.flatMap = function() { return this; };

const compile = (code) => {
  try {
    const f_ = new Function('janus', 'env', '$', 'arg', `${inject}; ${env};\n${code};`);
    const wrapped = (x) => {
      const env = { views: baseViews() };
      try {
        return success({ result: f_.call({}, janus, env, $, x), env });
      } catch(ex) { return fail(ex); }
    };
    return success(wrapped);
  } catch(ex) {
    return fail(ex);
  }
};

module.exports = { compile, success, fail };

