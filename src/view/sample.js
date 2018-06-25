const { List, DomView, template, find, from } = require('janus');
const { Sample } = require('../model/sample');
const $ = require('../util/dollar');
const { success } = require('../util/eval');

const SampleView = DomView.build($(`
  <div class="sample">
    <div class="sample-code"></div>
    <div class="sample-result"></div>
  </div>`), template(

  find('.sample-code').render(from.attribute('main')).context('edit').criteria({ attributes: { style: 'code' } }),
  find('.sample-result').render(from('last_success'))
));

// a couple of passthrough renderers to get a result view to appear:
const SuccessView = DomView.build($('<div class="eval-success"/>'), template(
  find('div').render(from.self((view) => new List(view.subject.value)))
));
class ViewView extends DomView {
  _initialize() { this.subject.options.app = this.options.app; }
  _render() { return this.subject.artifact(); }
  _wireEvents() { return this.subject.wireEvents(); }
  _destroy() { this.subject.destroy(); }
}

module.exports = {
  SampleView,
  registerWith: (library) => {
    library.register(Sample, SampleView);
    library.register(success, SuccessView);
    library.register(DomView, ViewView);
  }
};

