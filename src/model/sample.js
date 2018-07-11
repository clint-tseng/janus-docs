const { Model, attribute, List, bind, from } = require('janus');
const { compile, success, fail } = require('../util/eval');

const noop = (x) => success(x);

const Sample = Model.build(
  attribute('main', attribute.Text),

  bind('result', from('main').map(compile)
    .and('postprocess').map((code) => (code == null)
      ? noop
      : compile(code).successOrElse(noop))
    .and('reset')
    .all.flatMap((main, post) => main.flatMap((f) => f().flatMap(post)))
  )
);

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

