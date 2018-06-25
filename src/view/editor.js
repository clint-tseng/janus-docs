const { DomView, attribute } = require('janus');
const $ = require('../util/dollar');

require('codemirror/mode/javascript/javascript');
const CodeMirror = require('codemirror');

class EditorView extends DomView {
  _render() {
    const wrapper = $('<div class="code-editor"/>');
    this._cm = new CodeMirror((inner) => {
      wrapper.append(inner);
      setTimeout(() => { this._cm.refresh(); }, 0);
    }, {
      mode: 'javascript',
      value: this.subject.getValue(),
      viewportMargin: Infinity
    });
    return wrapper;
  }

  _wireEvents() {
    this._cm.on('change', (cm) => { this.subject.setValue(cm.getValue()); });
  }
}

module.exports = {
  EditorView,
  registerWith: (library) => library.register(attribute.Text, EditorView, { context: 'edit', attributes: { style: 'code' } })
};

