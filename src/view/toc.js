const { DomView, template, find, from, Model, bind } = require('janus');
const $ = require('janus-dollar');
const { Toc } = require('../model/toc');

const TocViewModel = Model.build(
  bind('active', from('subject').watch('path')
    .and.app('path').map((path) => path.replace(/^(.+)\/$/, '\1'))
    .all.map((own, current) => own === current))
);

const TocView = DomView.build($(`
  <div class="toc-entry">
    <a/>
    <div class="toc-children"/>
  </div>`), template(

  find('.toc-entry').classed('active', from('active')),

  find('a')
    .text(from('subject').watch('title'))
    .attr('href', from('subject').watch('path')),

  find('.toc-children').render(from('subject').watch('children'))
), { viewModelClass: TocViewModel });

module.exports = {
  TocViewModel, TocView,
  registerWith: (library) => { library.register(Toc, TocView); }
};

