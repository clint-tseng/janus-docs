const { Varying, DomView, mutators, from } = require('janus');
const $ = require('janus-dollar');
const { exists } = require('../util/util');

class ViewView extends DomView {
  _initialize() {
    this.subject.options.app = this.options.app;
    this.error = new Varying();
  }

  _render() {
    const dom = $(`<div class="view">
      <div class="view-content"/>
      <div class="view-error"/>
    </div>`);

    const errorWrapper = dom.find('.view-error');
    const point = this.pointer();
    this._bindings = [
      mutators.render(from.varying(this.error))(errorWrapper, point),
      mutators.classed('has-error', from.varying(this.error).map(exists))(errorWrapper, point)
    ];

    try {
      dom.find('.view-content').append(this.subject.artifact());
    } catch (ex) {
      this.error.set(ex);
    }

    return dom;
  }

  _wireEvents() {
    if (this.error.get() != null) return;

    try {
      this.subject.wireEvents();
    } catch (ex) {
      this.error.set(ex);
    }
  }

  _destroy() {
    this.subject.destroy();
    if (this._bindings != null) this._bindings.forEach((binding) => binding.stop());
  }
}

module.exports = {
  ViewView,
  registerWith: (library) => { library.register(DomView, ViewView); }
};

