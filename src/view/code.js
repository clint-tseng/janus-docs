const { DomView, template, find, from, attribute } = require('janus');

// used in place of the codemirror editor in ./editor.js on the server-side.
const StaticCodeView = DomView.build(
  $(`<pre class="code-static"><code/></pre>`),
  template(find('code').text(from((subject) => subject.getValue())))
);

module.exports = {
  StaticCodeView,
  registerWith: (library) => library.register(attribute.Text, StaticCodeView, { context: 'edit', style: 'code' })
};

