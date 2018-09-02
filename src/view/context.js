const { Model, DomView, find, from } = require('janus')
$ = require('janus-dollar')

const ContextModel = Model.build();
const withContext = (target, context) => new ContextModel({ target, context });

const ContextView = DomView.build($('<div/>'),
  find('div').render(from('target'))
    .context(from('context')));

module.exports = {
  ContextModel, ContextView,
  withContext,
  registerWith: (library) => { library.register(ContextModel, ContextView); }
};

