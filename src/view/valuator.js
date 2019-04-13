const { DomView, template, find, from } = require('janus');
const $ = require('janus-dollar');
const { not } = require('../util/util');
const { success } = require('../util/eval');
const { Valuator } = require('../model/valuator');
const { Statement } = require('../model/repl');
const { holdParent, Flyout } = require('../model/flyout');


////////////////////////////////////////////////////////////////////////////////
// QUICK VALUATOR
// used initially, in a flyout layout.

class QuickValuatorView extends DomView.build($(`
  <div class="valuator-quick">
    <div class="quick-statement"/>
    <button class="quick-expand" title="Full Editor"/>
  </div>`), template(
  find('.quick-statement')
    // here we deliberately don't react to changes, since whatever the initial
    // statement was when the valuator was created is what we always want to show.
    .render(from('statements').map((statements) => statements.at_(-1))),

  find('.quick-expand').on('click', (e, valuator, view) => {
    const sheet = view.options.app.sheet(valuator.get_('title'), valuator);
    valuator.destroyWith(sheet);

    // prepare to clear the flyout away, then do so:
    // first hold our parent flyout open as long as the sheet lives, if any.
    const flyoutView = view.closest(Flyout.Manual).first().get_();
    if (flyoutView != null) holdParent(flyoutView.subject.get_('trigger'), sheet);

    valuator.tap(); // because app#valuator/flyout will try (correctly) to destroy()
    view.closest(Flyout.Manual).first().get_().destroy(); // and now gone.
  })
)) {
  _wireEvents() {
    const valuator = this.subject;
    const statement = valuator.get_('statements').at_(-1);
    this.reactTo(statement.get('result'), false, (result) => {
      if (success.match(result)) valuator.set('result', result.get());
    });

    const { EditorView } = require('./editor');
    this.into(Statement).into(EditorView).first().get_().focus();
  }

  // if we aren't destroyed but we are asked to commit, it means a statement has
  // run but has failed. we still want to create a subsequent statement in case
  // the user goes expanded, but we don't want to focus on it.
  commit() { if (this.destroyed !== true) this.subject.createStatement(); }
}


////////////////////////////////////////////////////////////////////////////////
// FULL VALUATOR
// used when the valuator is expanded out into a sheet view.

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
  <div class="valuator">
    <button class="valuator-xray" title="Inspect via X-Ray"/>
    <div class="valuator-statements"/>
  </div>`), template(

  find('.valuator-statements')
    .render(from('statements'))
      .options({ renderItem: (r) => r.context('valuator') })

    .on('click', '.valuator-accept', (event, subject, view) => {
      const button = $(event.target);
      const result = button.view().subject.get_('result');
      if (success.match(result)) {
        try {
          subject.set('result', result.get());
        } catch (ex) {
          view.options.app.flyout(button, ex, { type: 'Manual' });
        }
      }
    })

    .on('commit', 'li:last-child .valuator-line', (e, subject, view) => {
      subject.get_('repl').createStatement();
      view.into('repl').into('statements').into(-1).into(EditorView).last().get_().focus();
    }),

  find('.valuator-xray').on('click', (e, repl, view) => {
    view.options.app.xray((result) => { repl.reference(result); });
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
    library.register(Valuator, QuickValuatorView, { context: 'quick' });
  }
};

