const { Model, attribute, bind, initial, List, DomView, template, find, from } = require('janus');
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


const anyByAttr = (attr) => (list) => list.any((item) => item.get(attr));
const anyMatch = anyByAttr('match');

const findMatch = (input, name) => {
  const caseSensitive = input.match(/[A-Z]/);
  try {
    const regex = new RegExp(input.replace('.', '\\.'), caseSensitive ? '' : 'i');
    return regex.test(name);
  } catch(_) {
    return name.includes(input);
  }
};

////////////////////////////////////////
// API OBJECT MEMBER

class ApiBrowserMember extends Model.build(
  bind('match', from('browser').get('find')
    .and('member').get('name')
    .all.map((input, name) => nonblank(input) && findMatch(input, name)))
) {}

const ApiBrowserMemberView = DomView.build($(`
  <div class="api-member">
    <a class="api-member-name"/>
    <div class="api-member-return-type"/>
  </div>`), template(

  find('.api-member').classed('match', from('match')),
  find('.api-member-name')
    .text(from('member').get('name'))
    .attr('href', from('object').get('path')
      .and('member').get('ref').map((name) => name.replace(/^#/, ''))
      .all.map((path, part) => `${path}#${part}`)),
  find('.api-member-return-type').text(from('member').get('return_type'))
));


////////////////////////////////////////
// API OBJECT SECTION

class ApiBrowserObjectSection extends Model.build(
  bind('match', from('members').flatMap(anyMatch))
) {
  _initialize() {
    // we do this this ugly way so incomplete sections don't crash everything.
    const object = this.get_('object');
    const browser = this.get_('browser');
    const members = [];
    for (const ref of this.get_('section').get_('members')) {
      const member = object.get_(`lookup.${ref}`);
      if (member != null)
        members.push(new ApiBrowserMember({ member, object, browser }));
    }
    this.set('members', new List(members));
  }
}

const ApiBrowserObjectSectionView = DomView.build($(`
  <div class="api-objsection">
    <a class="api-objsection-name"/>
    <div class="api-objsection-members"/>
  </div>`), template(

  find('.api-objsection').classed('match', from('match')),
  find('.api-objsection-name')
    .text(from('section').get('name'))
    .prop('href', from('object').get('path')
      .and('section').get('name').map((name) => name.toLowerCase().replace(/[^a-z]+/g, '-'))
      .all.map((path, part) => `${path}#${part}`)),
  find('.api-objsection-members').render(from('members'))
));


////////////////////////////////////////
// API OBJECT

class ApiBrowserObject extends Model.build(
  bind('match', from('sections').flatMap(anyMatch)
    .and('browser').get('find')
    .and('object').get('name')
    .all.map((childMatch, input, name) => childMatch ||
      (nonblank(input) && findMatch(input, name)))),

  bind('navigated', from('object').get('path').and('browser').get('path')
    .all.map((own, current) => own === current))
) {
  _initialize() {
    const object = this.get_('object');
    const browser = this.get_('browser');
    this.set('sections', object.get_('sections').map((section) =>
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
    .text(from('object').get('name'))
    .attr('href', from('object').get('path')),
  find('.api-object-sections').render(from('sections'))
));


////////////////////////////////////////
// TOC API SECTION

class ApiBrowserSection extends Model.build(
  initial('expanded.explicit', null),
  bind('expanded.match', from('objects').flatMap(anyMatch)),
  bind('expanded.navigated', from('objects').flatMap(anyByAttr('navigated'))),
  bind('expanded.final', from('expanded.explicit')
    .and('expanded.match')
    .and('expanded.navigated')
    .all.map((explicit, match, navigated) => match || ((explicit !== null) ? explicit : navigated)))
) {
  _initialize() {
    // ditto; we do this in this ugly way to soften missing objects.
    const api = this.get_('api');
    const browser = this.get_('browser');
    const objects = [];
    for (const name of this.get_('section.children')) {
      const object = api.get_(`lookup.${name}`);
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
  find('.api-section-objects')
    .render(from('objects'))
    .on('click', '.api-object-name', (_, subject) => {
      if (subject.get_('expanded.explicit') === false)
        subject.unset('expanded.explicit');
    }),

  find('button').on('click', (_, subject) => {
    // do nothing if a find operation is in progress:
    if (subject.get_('browser').get_('finding') === true) return;
    // otherwise, do the needful:
    subject.set('expanded.explicit', !subject.get_('expanded.final'));
  })
));


////////////////////////////////////////
// API BROWSER

class ApiBrowser extends Model.build(
  attribute('find', attribute.Text),
  bind('finding', from('find').map(nonblank)),
  bind('path', from('app').get('path'))
) {
  _initialize() {
    this.set('sections', this.get_('sections').map((section) =>
      new ApiBrowserSection({ section, api: this.get_('api'), browser: this })));
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

