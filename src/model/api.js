const { Model, attribute, List } = require('janus');

class ApiMember extends Model.build(
  attribute('invocations', attribute.List)
) {}
const ApiMembers = List.of(ApiMember);

class ApiSection extends Model.build(
  attribute('members', attribute.List)
) {}
const ApiSections = List.of(ApiSection);

class ApiObject extends Model.build(
  attribute('sections', attribute.List.of(ApiSections)),
  attribute('members', attribute.List.of(ApiMembers))
) {
  _initialize() {
    const lookup = {};
    for (const member of this.get_('members'))
      lookup[member.get_('ref')] = member;
    this.set('lookup', lookup);
  }
}

class Api extends Model {
  static deserialize(data) {
    const result = { lookup: {}, list: new List() };
    for (const objectData of data) {
      const object = ApiObject.deserialize(objectData);
      result.lookup[object.get_('name')] = object;
      result.list.add(object);
    }
    return new this(result);
  }
}

module.exports = { ApiMember, ApiSection, ApiObject, Api };

