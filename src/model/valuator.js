const { Model, bind, from } = require('janus');
const { Repl } = require('./repl');

class Valuator extends Model.build(
  bind('repl', from('env').map((inject) => new Repl({ env: { inject } })))
) {
  commit() { this.get_('repl').commit(); }
}

module.exports = { Valuator };

