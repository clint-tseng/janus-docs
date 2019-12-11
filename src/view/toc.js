const { DomView, template, find, from, Model, bind } = require('janus');
const { Toc } = require('../model/toc');
const { ApiBrowser } = require('./api');

class TocViewModel extends Model.build(
  bind('active', from.subject('path')
    .and.app('path').map((path) => path.replace(/^(.+)\/$/, '\\1'))
    .all.map((own, current) => own === current)),

  bind('prefix', from.subject('path')
    .and.app('path')
    .all.map((own, current) => current.startsWith(own) ||
      ((current === '/') && (own === '/intro')))) // special case: show getting started on homepage
) {
  _initialize() {
    // TODO: sort of hackish but this information is sort of scattered around.
    this.reactTo(this.get('active'), (active) => {
      if (active) $('title').text(`Janus | ${this.get_('subject').get_('title')}`);
    });
  }
};

const TocView = DomView.build(TocViewModel, $(`
  <div class="toc-entry">
    <a/>
    <div class="toc-children"/>
  </div>`), template(

  find('.toc-entry')
    .classed('active', from.vm('active'))
    .classed('prefix', from.vm('prefix')),

  find('a')
    .text(from('title'))
    .attr('href', from('path')),

  find('.toc-children').render(from('api')
    .and('children')
    .and('sections')
    .and.app()
    .and.app('api')
    .all.map((isApiToc, children, sections, app, api) => (isApiToc === true)
      ? new ApiBrowser({ sections, app, api })
      : children))
));

module.exports = {
  TocViewModel, TocView,
  registerWith: (library) => { library.register(Toc, TocView); }
};

