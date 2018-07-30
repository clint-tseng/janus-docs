const { Model, attribute } = require('janus');
const { Samples } = require('./sample');

const Article = Model.build(
  attribute('samples', attribute.List.of(Samples))
);

module.exports = { Article };

