const { List, DomView, template, find, from } = require('janus');
const { Sample } = require('../model/sample');
const $ = require('../util/dollar');
const { filter } = require('janus-stdlib').util.varying;
const { exists } = require('../util/util');
const { success, fail } = require('../util/eval');

class SampleView extends DomView.build($(`
  <div class="sample">
    <div class="sample-code"></div>
    <div class="sample-result"></div>
    <div class="sample-error"></div>
    <style class="sample-styles"></style>
  </div>`), template(

  find('.sample').classed('error', from('result').map(fail.match)),
  find('.sample-code').render(from.attribute('main')).context('edit').criteria({ attributes: { style: 'code' } }),
  find('.sample-result').render(from('result').pipe(filter(success.match))),
  find('.sample-error').render(from('result').map((x) => x.failOrElse(null)).pipe(filter(exists))),
  find('.sample-styles').text(from('styles'))
)) {
  _wireEvents() {
    // TODO: less haphazard way to plumb this action through.
    const dom = this.artifact();
    dom.on('code-navigate', (event, { line, col }) => {
      dom.find('.code-editor').data('view').setCursor(line, col);
    });
  }
}

// a passthrough renderer to get a result view to appear:
const SuccessView = DomView.build($('<div class="eval-success"/>'), template(
  find('div').render(from.self((view) => new List(view.subject.value.result)))
    .options(from.self((view) => ({ app: view.options.app.with({ views: view.subject.value.env.views }) })))
));

module.exports = {
  SampleView,
  registerWith: (library) => {
    library.register(Sample, SampleView);
    library.register(success, SuccessView);
  }
};

