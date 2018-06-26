const { Model, attribute, List, bind, from } = require('janus');
const { filter } = require('janus-stdlib').util.varying;
const { compile, success, fail } = require('../util/eval');

const noop = (x) => success(x);

const Sample = Model.build(
  attribute('main', attribute.Text),

  bind('result', from('main').map(compile)
    .and('postprocess').map((code) => (code == null)
      ? noop
      : compile(code).successOrElse(noop))
    .all.flatMap((main, post) => main.flatMap((f) => f().flatMap(post)))
  ),

  bind('last_success', from('result').pipe(filter(success.match)))
);

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

