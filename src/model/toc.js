const { Model, attribute, bind, from, List } = require('janus');
const { exists } = require('../util/util');

const Toc = Model.build(
  attribute('children', attribute.List.Recursive),
  attribute('sections', attribute.List),
  bind('api', from('sections').map(exists))
);

const Tocs = List.of(Toc);

module.exports = { Toc, Tocs };

