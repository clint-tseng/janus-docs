const { List, DomView, template, find, from } = require('janus');
const { Sample } = require('../model/sample');
const $ = require('janus-dollar');
const { filter } = require('janus-stdlib').varying;
const { exists, blank, equals } = require('../util/util');
const { success, fail } = require('../util/eval');

class SampleView extends DomView.build($(`
  <div class="sample">
    <div class="sample-code"></div>
    <div class="sample-toolbar">
      <button class="sample-revert" title="Revert to Original"/>
      <button class="sample-transfer" title="Copy to Console"/>
    </div>
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

  find('.sample-revert')
    .classed('disabled', from('main').and('initial').all.map(equals))
    .on('click', (e, subject) => { subject.set('main', subject.get_('initial')); }),

  find('.sample-transfer')
    .classed('disabled', from('result.final').map(fail.match))
    .on('click', (e, subject, view) => {
      if ($(e.target).hasClass('disabled')) return;
      const app = view.options.app;
      const repl = app.get_('repl.obj');
      const last = repl.get_('statements').get_(-1);
      const target = blank(last.get_('code')) ? last : repl.createStatement();
      const code = subject.get_('main').replace(/(?:\n|^)(?:\s*)return ([^\n]+)(?:$|\n)/, '$1');

      app.set('repl.active', true);
      target.set('code', code);
      target.commit();
    }),

  find('.sample-error').render(from('result.final').map((x) => x.failOrElse(null)).pipe(filter(exists))),
  find('.sample-styles').text(from('styles'))
)) {
  _wireEvents() {
    // TODO: less haphazard way to plumb this action through.
    const dom = this.artifact();
    dom.on('code-navigate', (_, { line, col }) => {
      dom.find('.code-editor').data('view').setCursor(line, col);
    });

    dom.on('code-focus', _ => { dom.addClass('activated'); });
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

