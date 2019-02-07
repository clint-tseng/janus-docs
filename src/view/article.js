const { DomView, from, mutators } = require('janus');
const $ = require('janus-dollar');
const { Article } = require('../model/article');

class ArticleView extends DomView {
  _render() {
    // we have to render on our own because the markup is not statically known.
    // we count heavily here on Articles being static, which they are.
    const dom = $(this.subject.get_('html'));
    this._drawSamples(dom);
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

