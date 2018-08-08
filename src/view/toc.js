const { DomView, template, find, from, Model, bind } = require('janus');
const $ = require('janus-dollar');
const { Toc } = require('../model/toc');

const TocViewModel = Model.build(
  bind('active', from('subject').watch('path')
    .and.app('path').map((path) => path.replace(/^(.+)\/$/, '\1'))
    .all.map((own, current) => own === current)),

  bind('prefix', from('subject').watch('path')
    .and.app('path')
    .all.map((own, current) => current.startsWith(own) ||
      ((current === '/') && (own === '/intro')))) // special case: show getting started on homepage
);

const TocView = DomView.build($(`
  <div class="toc-entry">
    <a/>
    <div class="toc-children"/>
  </div>`), template(

  find('.toc-entry')
    .classed('active', from('active'))
    .classed('prefix', from('prefix')),

  find('a')
    .text(from('subject').watch('title'))
    .attr('href', from('subject').watch('path')),

  find('.toc-children').render(from('subject').watch('children'))
), { viewModelClass: TocViewModel });

module.exports = {
  TocViewModel, TocView,
  registerWith: (library) => { library.register(Toc, TocView); }
};

