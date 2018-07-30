const { Model, attribute, List } = require('janus');

// awkward shuffledance to allow a recursive list.
// TODO: attribute.List.ofRecursive or something?

class tocsAttribute extends attribute.List {}
const Toc = Model.build(attribute('children', tocsAttribute));
const Tocs = List.of(Toc);
tocsAttribute.listClass = Tocs;

module.exports = { Toc, Tocs };

