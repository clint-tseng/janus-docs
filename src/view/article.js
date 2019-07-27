const { DomView, from, mutators } = require('janus');
const { Article } = require('../model/article');

class ArticleView extends DomView {
  _render() {
    // we have to render on our own because the markup is not statically known.
    // we count heavily here on Articles being static, which they are.
    const dom = $(this.subject.get_('html'));
    this._drawSamples(dom);

    // if we find an #api-index div and it's empty, we want to render an API index.
    // theoretically, this should only happen on offline-render server-side.
    const index = dom.find('#api-index');
    if ((index.length > 0) && (index.children().length === 0)) {
      const app = this.options.app;
      index.append(app.view(app.get_('api'), { context: 'index' }).artifact());
    }

    return dom;
  }

  _attach(dom) { this._drawSamples(dom); }

  _drawSamples(dom) {
    const point = this.pointer();
    this._bindings = this.subject.get_('samples').list.map((sample) =>
      mutators.render(from(sample))(dom.find(`#sample-${sample.get_('id')}`), point));
  }
}

module.exports = {
  ArticleView,
  registerWith: (library) => { library.register(Article, ArticleView); }
};

