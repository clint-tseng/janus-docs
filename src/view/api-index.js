const { DomView, template, find, from, Model } = require('janus');
const { Api, ApiObject, ApiMember } = require('../model/api');

const ApiIndexView = DomView.build(
  $('<div class="api-index"/>'),
  find('.api-index').render(from('list'))
    .options({ renderItem: (x) => x.context('index') })
);

const ApiObjectIndexView = DomView.build($(`
  <div class="api-index-object">
    <h2><a/></h2>
    <div class="api-index-members"/>
  </div>`), template(

  find('h2 a')
    .text(from('name'))
    .attr('href', from('path')),

  find('.api-index-members')
    .render(from.subject().and('members').all.map((object, members) =>
      members.map((member) => new ApiMemberIndex({ member, object }))))
));

const ApiMemberIndex = Model.build();
const ApiMemberIndexView = DomView.build($(`
  <div class="api-index-member">
    <a/> <span/>
  </div>`), template(

  find('a')
    .text(from('member').get('name'))
    .attr('href', from('object').get('path')
      .and('member').get('ref').map(s => s.replace(/^#/, ''))
      .all.map((path, part) => `${path}#${part}`)),

  find('span').text(from('member').get('return_type'))
));

module.exports = {
  ApiIndexView, ApiObjectIndexView, ApiMemberIndex, ApiMemberIndexView,
  registerWith(library) {
    library.register(Api, ApiIndexView, { context: 'index' });
    library.register(ApiObject, ApiObjectIndexView, { context: 'index' });
    library.register(ApiMemberIndex, ApiMemberIndexView);
  }
};

