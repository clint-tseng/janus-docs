const { Model, attribute, List, bind, from } = require('janus');
const { compile, success, fail, inert } = require('../util/eval');

const noop = (x) => success(x);

const Sample = Model.build(
  attribute('main', attribute.Text),

  bind('computation', from('main').map(compile)
    .and('postprocess').map((code) => (code == null)
      ? noop
      : compile(code).successOrElse(noop))
    .all.flatMap((main, post) => main.flatMap((f) => f().flatMap(post)))
  ),

  // we don't want to compile or run the sample code unless we actually care
  // about it, so we don't directly involve computation in our fromchain.
  bind('result', from('noexec').and.self().all.flatMap((noexec, self) =>
    (noexec == true) ? inert() : self.watch('computation')))
);

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

