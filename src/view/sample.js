const { List, DomView, template, find, from } = require('janus');
const { Sample } = require('../model/sample');
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
      app.set('repl.active', true); // we do this first to resolve initial display redraw
      app.get_('repl.obj').transfer(subject.get_('main'));
      app.get_('repl.view').focusLast();
    }),

  find('.sample-error').render(from('result.final').map((x) => x.failOrElse(null)).pipe(filter(exists))),
  find('.sample-styles').text(from('styles'))
)) {
  _wireEvents() {
    const dom = this.artifact();
    dom.on('code-navigate', (_, { line, col }) => {
      const { EditorView } = require('./editor');
      this.into(EditorView).first().get_().setCursor(line, col);
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

