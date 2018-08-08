const { List, DomView, template, find, from } = require('janus');
const { Sample } = require('../model/sample');
const $ = require('janus-dollar');
const { filter } = require('janus-stdlib').varying;
const { exists } = require('../util/util');
const { success, fail } = require('../util/eval');

class SampleView extends DomView.build($(`
  <div class="sample">
    <div class="sample-code"></div>
    <div class="sample-result"></div>
    <div class="sample-error"></div>
    <style class="sample-styles"></style>
  </div>`), template(

  find('.sample')
    .classed('error', from('result.final').map(fail.match))
    .classed('noexec', from('noexec'))
    .classed('custom-view', from('env.view').map(exists)),

  find('.sample-code').render(from.attribute('main')).context('edit').criteria({ style: 'code' })
    .options(from('language').map((language) => ({ language }))),

  find('.sample-result').render(from('result.final').pipe(filter(success.match))
    .and('env.view').all.map((result, customView) => customView || result)),

  find('.sample-error').render(from('result.final').map((x) => x.failOrElse(null)).pipe(filter(exists))),
  find('.sample-styles').text(from('styles'))
)) {
  _wireEvents() {
    // TODO: less haphazard way to plumb this action through.
    const dom = this.artifact();
    dom.on('code-navigate', (_, { line, col }) => {
      dom.find('.code-editor').data('view').setCursor(line, col);
    });
  }
}

// a passthrough renderer to get a result view to appear:
const SuccessView = DomView.build($('<div class="eval-success"/>'), template(
  find('div').render(from.self((view) => new List(view.subject.get())))
));

module.exports = {
  SampleView,
  registerWith: (library) => {
    library.register(Sample, SampleView);
    library.register(success, SuccessView);
  }
};

