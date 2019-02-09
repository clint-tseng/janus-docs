const { Model, attribute, bind, DomView, template, find, from } = require('janus')
$ = require('janus-dollar')


// really just switches inspection contexts between standard and panel.
class ContextModel extends Model.build(
  bind('context', from('panel').map((p) => (p === true) ? 'panel' : 'default')),
  attribute('panel', attribute.Boolean)
) {
  get isContext() { return true; }
}

const ContextView = DomView.build($(`
  <div class="context-view">
    <div class="context-content"/>
    <div class="context-switcher"/>
  </div>`), template(
  find('.context-content').render(from('target')).context(from('context')),
  find('.context-switcher')
    .classed('hide', from('panel'))
    .render(from.attribute('panel'))
      .criteria({ context: 'edit', style: 'button' })));

const withPanelSwitch = (target) => new ContextModel({ target });
const asPanel = (target, context) => new ContextModel({ target, panel: true });


module.exports = {
  ContextModel, ContextView,
  withPanelSwitch, asPanel,
  registerWith: (library) => { library.register(ContextModel, ContextView); }
};

