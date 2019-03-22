const { DomView, template, find, from, match, Model, bind, attribute, dēfault, List } = require('janus');
const $ = require('janus-dollar');

const { Statement, Reference, Repl } = require('../model/repl');
const { success, fail } = require('../util/eval');
const { blank, not, give, ifExists } = require('../util/util');
const { inspect } = require('../util/inspect');


////////////////////////////////////////////////////////////////////////////////
// STATEMENTS

const StatementVM = Model.build(
  bind('result', from.subject('result').map(ifExists((result) => result.mapSuccess(inspect).get()))),

  attribute('panel.direct', attribute.Boolean),
  bind('panel.repl', from('view').flatMap((view) => {
    const replView = view.closest(Repl).first().get_();
    return (replView == null) ? false : replView.subject.get('autopanel');
  })),
  bind('context', from('panel.direct').and('panel.repl').all.map((x, y) => (x || y) ? 'panel' : null))
);

const StatementView = DomView.withOptions({ viewModelClass: StatementVM }).build($(`
  <div class="statement">
    <div class="statement-placeholder">line</div>
    <div class="statement-name"/>
    <div class="statement-toolbox">
      <span class="statement-panel" title="View as panel"/>
    </div>

    <div class="statement-code"/>
    <div class="statement-result"/>
  </div>
`), template(
  find('.statement').classed('named', from('named')),
  find('.statement-name').render(from.attribute('name')).context('edit'),

  find('.statement-panel').render(from.vm().attribute('panel.direct'))
    .criteria({ context: 'edit', style: 'button' })
    .options({ stringify: give('') }),

  find('.statement-result').render(from.vm('result'))
    .context(from.vm('context'))
    .options(from.app().and('env.final').all.map((app, env) =>
      ({ app: app.with({ eval: { env } }) }))),

  find('.statement-code').render(from.attribute('code'))
    .criteria({ context: 'edit', style: 'code' })
    .options(from.self().map((view) => ({
      onCommit: () => {
        if (view.subject.commit() === true) {
          view.closest(Repl).first().get_().commit();
          return true;
        }
        return false;
      }
    })))
));

// TODO: repetitive with above; sort of awaiting janus#138
const ReferenceView = DomView.withOptions({ viewModelClass: StatementVM }).build($(`
  <div class="statement">
    <div class="statement-placeholder">value</div>
    <div class="statement-name"/>
    <div class="statement-result"/>
  </div>`), template(
  find('.statement').classed('named', from('named')),
  find('.statement-name').render(from.attribute('name')).context('edit'),
  find('.statement-result').render(from.vm('result')).context(from.vm('context'))
));


////////////////////////////////////////////////////////////////////////////////
// PINS

const Pin = Model.build(dēfault('expanded', true, attribute.Boolean));

const PinView = DomView.build($(`
  <div class="pin">
    <div class="pin-chrome">
      <div class="pin-expand"/>
      <button class="pin-remove"/>
    </div>
    <div class="pin-contents"/>
  </div>
`), template(
  find('.pin-contents').render(from('subject')),

  find('.pin').classed('expanded', from('expanded')),
  find('.pin-expand').render(from.attribute('expanded'))
    .criteria({ context: 'edit', style: 'button' }).options({ stringify: give('') }),

  find('.pin-remove').on('click', (e, subject, view) => {
    // we do this by index on the parent list in case multiple instances of this
    // item exist.
    const idx = $(event.target).closest('li').prevAll().length;
    view.closest(List).first().get_().subject.parent.removeAt(idx);
  }),
));


////////////////////////////////////////////////////////////////////////////////
// REPL

class ReplView extends DomView.build($(`
  <div class="repl">
    <div class="repl-chrome">
      <button class="repl-close" title="Close Console"/>
      <h2>Console</h2>

      <div class="repl-toolbar">
        <button class="repl-xray" title="Inspect via X-Ray"/>
        <span class="repl-autopanel" title="View all as panel"/>
      </div>
    </div>
    <div class="repl-main"/>
    <div class="repl-pins">
      <div class="repl-chrome">
        <button class="repl-pins-clear" title="Clear Pins"/>
        <h2>Pinned Objects</h2>
      </div>
      <div class="repl-pins-list"/>
    </div>
  </div>
`), template(
  find('.repl').classed('autopaneled', from('autopanel')),
  find('.repl-close').on('click', (e, s, view) => { view.options.app.hideRepl(); }),
  find('.repl-xray').on('click', (e, repl, view) => {
    view.options.app.xray((result) => { repl.reference(result); });
  }),
  find('.repl-autopanel').render(from.attribute('autopanel'))
    .criteria({ context: 'edit', style: 'button' })
    .options({ stringify: give('') }),

  find('.repl-main')
    .render(from('statements'))
      .criteria({ wrap: false })
    .on('click', (event, _, view) => {
      if ($(event.target).is('.repl-main, .repl-statement, .repl-statement-result'))
        view.focusLast();
    }),

  find('.repl').classed('has-pins', from('pins').flatMap((pins) => pins.nonEmpty())),
  find('.repl-pins-clear').on('click', (e, subject) => subject.get_('pins').removeAll()),
  find('.repl-pins-list')
    .render(from('pins').map((pins) => pins.map((subject) => new Pin({ subject }))))
    .criteria({ wrap: false })
)) {
  commit() {
    this.subject.createStatement();
    this.focusLast();
  }
  focusLast() {
    const { EditorView } = require('./editor');
    this.into('statements').into(-1).into(EditorView).last().get_().focus();
  }
}


module.exports = {
  ReplView,
  PinView,
  StatementView,
  registerWith: (library) => {
    library.register(Statement, StatementView);
    library.register(Reference, ReferenceView);
    library.register(Pin, PinView);
    library.register(Repl, ReplView);
  }
};

