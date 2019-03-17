const { DomView, template, find, from } = require('janus');
const $ = require('janus-dollar');
const { not } = require('../util/util');
const { success } = require('../util/eval');
const { Valuator } = require('../model/valuator');
const { Statement } = require('../model/repl');


const fromSelf = (f) => from.self().map(f);
const ValuatorLineView = DomView.build($(`
  <div class="valuator-line">
    <div class="valuator-statement"/>
    <button class="valuator-accept" title="Use this value"/>
  </div>`), template(
  find('.valuator-statement')
    .render(fromSelf((view) => view.subject))
    .options(fromSelf((view) => ({ onCommit() { view.artifact().trigger('commit'); } }))),
  find('.valuator-accept').classed('disabled', from('result').map(success.match).map(not))
));


class ValuatorView extends DomView.build($(`
  <div class="valuator"/>`), template(

  find('.valuator')
    .render(from('statements'))
      .options({ renderItem: (r) => r.context('valuator') })

    .on('click', '.valuator-accept', (event, subject, view) => {
      const button = $(event.target);
      const result = button.view().subject.get_('result');
      if (success.match(result)) {
        try {
          subject.set('result', result.get());
        } catch (ex) {
          view.options.app.flyout(button, ex);
        }
      }
    })

    .on('commit', 'li:last-child .valuator-line', (e, subject, view) => {
      subject.get_('repl').createStatement();
      view.into('repl').into('statements').into(-1).into(EditorView).last().get_().focus();
    })
)) {
  _wireEvents() {
    // any time a new statement is created, focus it.
    const { EditorView } = require('./editor');
    this.into('statements').into(-1).last().get().react((statementView) => {
      if (statementView == null) return;
      statementView.into().into(EditorView).last().get_().focus();
    });
  }

  commit() { this.subject.createStatement(); }
}


module.exports = {
  ValuatorLineView,
  ValuatorView,
  registerWith: (library) => {
    library.register(Statement, ValuatorLineView, { context: 'valuator' });
    library.register(Valuator, ValuatorView);
  }
};

