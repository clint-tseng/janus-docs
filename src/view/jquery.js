const { DomView } = require('janus');

class JQueryView extends DomView {
  _render() { return this.subject; }
}

module.exports = {
  JQueryView,
  registerWith(library) { library.register($, JQueryView); }
};

