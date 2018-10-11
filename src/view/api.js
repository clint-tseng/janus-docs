const { Model, attribute, bind, dēfault, List, DomView, template, find, from } = require('janus');
const $ = require('janus-dollar');
const { nonblank, not } = require('../util/util');

// TODO: there's probably a better way to do this but my brain is mush at this
// point and i just gotta power through this nightmare gigantoproject.

// Here we merge a lot of things together, it's worth keeping a record.
// We start with the API information in the TOC itself, which are string references
// to actual objects in the API model. The API model itself also contains section
// information about its own members; we use this to drive the display.
//
// In reverse order, as with the implementation below:
// * ApiBrowserObjectSections + Object/Members => ApiBrowserMembers
// * ApiBrowserObjects + Object/Sections => ApiBrowserObjectSections
// * ApiBrowserSections + Api/ApiObjects => ApiBrowserObjects
// * TocApiSections + Api => ApiBrowser with ApiBrowserSections


const anyByAttr = (attr) => (list) => list.any((item) => item.watch(attr));
const anyMatch = anyByAttr('match');

const findMatch = (input, name) => {
  const caseSensitive = input.match(/[A-Z]/);
  const regex = new RegExp(input.replace('.', '\\.'), caseSensitive ? '' : 'i');
  return name.match(regex) != null;
};

////////////////////////////////////////
// API OBJECT MEMBER

class ApiBrowserMember extends Model.build(
  bind('match', from('browser').watch('find')
    .and('member').watch('name')
    .all.map((input, name) => nonblank(input) && findMatch(input, name)))
) {}

const ApiBrowserMemberView = DomView.build($(`
  <div class="api-member">
    <a class="api-member-name"/>
    <div class="api-member-return-type"/>
  </div>`), template(

  find('.api-member').classed('match', from('match')),
  find('.api-member-name')
    .text(from('member').watch('name'))
    .attr('href', from('object').watch('path')
      .and('member').watch('name').map((name) => name.replace(/^#/, ''))
      .all.map((path, part) => `${path}#${part}`)),
  find('.api-member-return-type').text(from('member').watch('return_type'))
));


////////////////////////////////////////
// API OBJECT SECTION

class ApiBrowserObjectSection extends Model.build(
  bind('match', from('members').flatMap(anyMatch))
) {
  _initialize() {
    // we do this this ugly way so incomplete sections don't crash everything.
    const object = this.get('object');
    const browser = this.get('browser');
    const members = [];
    for (const name of this.get('section').get('members')) {
      const member = object.get(`lookup.${name}`);
      if (member != null)
        members.push(new ApiBrowserMember({ member, object, browser }));
    }
    this.set('members', new List(members));
  }
}

const ApiBrowserObjectSectionView = DomView.build($(`
  <div class="api-objsection">
    <div class="api-objsection-name"/>
    <div class="api-objsection-members"/>
  </div>`), template(

  find('.api-objsection').classed('match', from('match')),
  find('.api-objsection-name').text(from('section').watch('name')),
  find('.api-objsection-members').render(from('members'))
));


////////////////////////////////////////
// API OBJECT

class ApiBrowserObject extends Model.build(
  bind('match', from('sections').flatMap(anyMatch)
    .and('browser').watch('find')
    .and('object').watch('name')
    .all.map((childMatch, input, name) => childMatch ||
      (nonblank(input) && findMatch(input, name)))),

  bind('navigated', from('object').watch('path').and('browser').watch('path')
    .all.map((own, current) => own === current))
) {
  _initialize() {
    const object = this.get('object');
    const browser = this.get('browser');
    this.set('sections', object.get('sections').map((section) =>
      new ApiBrowserObjectSection({ object, section, browser })));
  }
}

const ApiBrowserObjectView = DomView.build($(`
  <div class="api-object">
    <a class="api-object-name"/>
    <div class="api-object-sections"/>
  </div>`), template(

  find('.api-object')
    .classed('match', from('match'))
    .classed('navigated', from('navigated')),
  find('.api-object-name')
    .text(from('object').watch('name'))
    .attr('href', from('object').watch('path')),
  find('.api-object-sections').render(from('sections'))
));


////////////////////////////////////////
// TOC API SECTION

class ApiBrowserSection extends Model.build(
  dēfault('expanded.explicit', null),
  bind('expanded.match', from('objects').flatMap(anyMatch)),
  bind('expanded.navigated', from('objects').flatMap(anyByAttr('navigated'))),
  bind('expanded.final', from('expanded.explicit')
    .and('expanded.match')
    .and('expanded.navigated')
    .all.map((explicit, match, navigated) => match || ((explicit !== null) ? explicit : navigated)))
) {
  _initialize() {
    // ditto; we do this in this ugly way to soften missing objects.
    const api = this.get('api');
    const browser = this.get('browser');
    const objects = [];
    for (const name of this.get('section.children')) {
      const object = api.get(`lookup.${name}`);
      if (object != null)
        objects.push(new ApiBrowserObject({ object, api, browser }));
    }
    this.set('objects', new List(objects));
  }
}

const ApiBrowserSectionView = DomView.build($(`
  <div class="api-section">
    <button class="api-section-header">
      <h2 class="api-section-title"/>
    </button>
    <div class="api-section-objects"/>
  </div> `), template(

  find('.api-section')
    .classed('match', from('match'))
    .classed('expanded', from('expanded.final')),
  find('.api-section-title').text(from('section.title')),
  find('.api-section-objects').render(from('objects')),

  find('button').on('click', (_, subject) => {
    // do nothing if a find operation is in progress:
    if (subject.get('browser').get('finding') === true) return;
    // otherwise, do the needful:
    subject.set('expanded.explicit', !subject.get('expanded.final'));
  })
));


////////////////////////////////////////
// API BROWSER

class ApiBrowser extends Model.build(
  attribute('find', attribute.Text),
  bind('finding', from('find').map(nonblank)),
  bind('path', from('app').watch('path'))
) {
  _initialize() {
    this.set('sections', this.get('sections').map((section) =>
      new ApiBrowserSection({ section, api: this.get('api'), browser: this })));
  }
}

const ApiBrowserView = DomView.build($(`
  <div class="api-browser">
    <div class="api-find">
      <div class="api-find-input"/>
      <button class="api-find-clear">&times;</button>
    </div>
    <div class="api-sections"/>
  </div>`), template(

  find('.api-browser').classed('finding', from('find').map(nonblank)),
  find('.api-find-input').render(from.attribute('find'))
    .context('edit')
    .options({ placeholder: 'Find…' }),
  find('.api-find-clear')
    .classed('hide', from('finding').map(not))
    .on('click', (_, subject) => { subject.set('find', ''); }),
  find('.api-sections').render(from('sections'))
));


////////////////////
// EXPORTS

module.exports = {
  ApiBrowserMember,
  ApiBrowserObjectSection,
  ApiBrowserObject,
  ApiBrowserSection,
  ApiBrowser,

  registerWith: (library) => {
    library.register(ApiBrowserMember, ApiBrowserMemberView);
    library.register(ApiBrowserObjectSection, ApiBrowserObjectSectionView);
    library.register(ApiBrowserObject, ApiBrowserObjectView);
    library.register(ApiBrowserSection, ApiBrowserSectionView);
    library.register(ApiBrowser, ApiBrowserView);
  }
};

