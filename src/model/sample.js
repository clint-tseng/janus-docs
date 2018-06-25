const { Model, attribute, List, bind, from } = require('janus');
const { filter } = require('janus-stdlib').util.varying;
const { ifPresent, compose, flattenCase } = require('../util/util');
const { compile, success, fail } = require('../util/eval');

// flattens eg success(success(success(42))) into success(42).
// anything else will return fail.
const flatSuccess = (x) => success.match(x, (inner) => (inner.case != null) ? flatSuccess(inner) : success(inner)) || fail();

const Sample = Model.build(
  attribute('main', attribute.Text),

  bind('result', from('main').map(compile)
    .and('postprocess').map(ifPresent(compose(compile, (x) => x.successOrElse(null))))
    .all.flatMap((main, post) => main.mapSuccess((f) => (post == null) ? f() : post(f())))
  ),

  bind('last_success', from('result').map(flatSuccess).pipe(filter(success.match)))
);

const Samples = List.of(Sample);

module.exports = { Sample, Samples };

