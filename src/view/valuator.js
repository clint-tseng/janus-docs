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


const ValuatorView = DomView.build($(`
  <div class="valuator"/>`), template(

  find('.valuator')
    .render(from('repl').get('statements'))
      .options({ renderItem: (r) => r.context('valuator') })

    .on('click', '.valuator-accept', (event, subject) => {
      const statement = $(event.target).closest('.valuator-line').data('view').subject;
      const result = statement.get_('result');
      if (success.match(result)) subject.set('result', result.get());
    })

    .on('commit', 'li:last-child .valuator-line', (e, subject, view) => {
      subject.get_('repl').createStatement();
      // TODO: copypasta AND a hack.
      const lastEditorView = view.artifact().find('li:last-child .code-editor').data('view');
      lastEditorView.focus();
    })
));


module.exports = {
  ValuatorLineView,
  ValuatorView,
  registerWith: (library) => {
    library.register(Statement, ValuatorLineView, { context: 'valuator' });
    library.register(Valuator, ValuatorView);
  }
};

