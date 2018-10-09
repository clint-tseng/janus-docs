const { Model, attribute, bind, from, List } = require('janus');
const { exists } = require('../util/util');

// awkward shuffledance to allow a recursive list.
// TODO: attribute.List.ofRecursive or something?

class tocsAttribute extends attribute.List {}
const Toc = Model.build(
  attribute('children', tocsAttribute),
  attribute('sections', attribute.List),
  bind('api', from('sections').map(exists))
);

const Tocs = List.of(Toc);
tocsAttribute.listClass = Tocs;

module.exports = { Toc, Tocs };

