const { DomView } = require('janus');

class JQueryView extends DomView {
  _render() {
    if (this.subject.parent().length > 0) return $('<span>(dom node)</span>');
    return this.subject;
  }
}

module.exports = {
  JQueryView,
  registerWith(library) { library.register($, JQueryView); }
};

