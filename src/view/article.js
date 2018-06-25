const { DomView, from, mutators } = require('janus');
const $ = require('../util/dollar');
const { Article } = require('../model/article');

class ArticleView extends DomView {
  _render() {
    // we have to render on our own because the markup is not statically known.
    // we count heavily here on Articles being static, which they are.
    const dom = $(this.subject.get('html'));
    const point = this.pointer();
    this._bindings = this.subject.get('samples').list.map((sample) =>
      mutators.render(from(sample))(dom.find(`#sample-${sample.get('id')}`), point));
    return dom;
  }
}

module.exports = {
  ArticleView,
  registerWith: (library) => { library.register(Article, ArticleView); }
};

