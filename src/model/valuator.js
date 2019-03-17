const { Model, bind, from } = require('janus');
const { Repl } = require('./repl');

// TODO: should this even be a separate model?
class Valuator extends Repl {}

module.exports = { Valuator };

