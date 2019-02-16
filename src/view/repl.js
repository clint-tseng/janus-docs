const { DomView, template, find, from, match, Model, attribute, dēfault } = require('janus');
const $ = require('janus-dollar');

const { Statement, Repl } = require('../model/repl');
const { success, fail } = require('../util/eval');
const { blank, not, give } = require('../util/util');
const { withPanelSwitch } = require('../view/context');
const { inspect } = require('../util/inspect');


////////////////////////////////////////////////////////////////////////////////
// STATEMENTS

const inspectWithSwitch = (x) => withPanelSwitch(inspect(x))

const StatementView = DomView.build($(`
  <div class="repl-statement">
    <div class="repl-statement-name"/>
    <div class="repl-statement-code"/>
    <div class="repl-statement-status"/>
    <div class="repl-statement-result"/>
  </div>
`), template(
  find('.repl-statement').classed('named', from('named')),
  find('.repl-statement-name').render(from.attribute('name'))
    .context('edit')
    .options(from('seqId').map((seqId) => ({ placeholder: `line ${seqId + 1}` }))),

  find('.repl-statement-status')
    .classGroup('status-', from('result').map(match(
      success(give('success')), fail(give('error')))))
    .classed('no-status', from('has_code').map(not)),

  find('.repl-statement-result').render(from('active')
    .and('result').map((result) => result.mapSuccess(inspectWithSwitch))
    .all.map((active, result) => active ? result : null)),

  find('.repl-statement-code').render(from.attribute('code'))
    .criteria({ context: 'edit', style: 'code' })
    .options(from.self().map((view) => ({
      onCommit: () => {
        if (view.subject.commit() === true) {
          if (typeof view.options.onCommit === 'function') view.options.onCommit();
          return true;
        }
        return false;
      }
    })))
));


////////////////////////////////////////////////////////////////////////////////
// PINS

const Pin = Model.build(
  dēfault('expanded', true, attribute.Boolean)
);

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

  find('.pin-remove').on('click', (e, subject) => {
    // we do this by index on the parent list in case multiple instances of this
    // item exist. TODO: awkward reference. what to do?
    const item = $(event.target).closest('li');
    const idx = item.prevAll().length;
    const list = item.closest('.janus-list').data('view').subject.parent;
    list.removeAt(idx);
  }),
));


////////////////////////////////////////////////////////////////////////////////
// REPL

class ReplView extends DomView.build($(`
  <div class="repl">
    <div class="repl-chrome">
      <button class="repl-close" title="Close Console"/>
      <h2>Console</h2>
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
  find('.repl-main').render(from('statements'))
    .options(from.self().map((view) => ({
      renderItem: (render) => render.options({ onCommit: () => { view.commit(); } })
    }))),

  find('.repl-close').on('click', (e, s, view) => { view.options.app.hideRepl(); }),
  find('.repl-main')
    .on('click', (event, _, view) => {
      if (event.target === view.artifact().find('.repl-main')[0])
        view.focusLast();
    }),

  find('.repl').classed('has-pins', from('pins').flatMap((pins) => pins.nonEmpty())),
  find('.repl-pins-clear').on('click', (e, subject) => subject.get_('pins').removeAll()),
  find('.repl-pins-list').render(from('pins').map((pins) => pins.map((subject) => new Pin({ subject }))))
)) {
  commit() {
    this.subject.commit();
    this.focusLast();
  }
  focusLast() {
    // TODO: still feels like a hack.
    const lastEditorView = this.artifact().find('.repl-main > ul > li:last-child .code-editor').data('view');
    lastEditorView.focus();
  }
}

module.exports = {
  ReplView,
  PinView,
  StatementView,
  registerWith: (library) => {
    library.register(Statement, StatementView);
    library.register(Pin, PinView);
    library.register(Repl, ReplView);
  }
};

