const { Model, bind, from } = require('janus');
const { Repl } = require('./repl');

// TODO: should this even be a separate model?
class Valuator extends Repl {
  _initialize() {
    Repl.prototype._initialize.call(this); // thanks for nothing es6
    for (const { name, value } of this.get_('initial'))
      this.reference(value, name);
  }
}

module.exports = { Valuator };

