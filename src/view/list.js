// so this might find its way back into stdlib at some point but we're going to
// try it out here first.
//
// stdlib does an extra wrapping layer because it's safer, in case a view it's
// rendering has multiple root nodes. but if you know you have a singular root
// node at all times, this approach is much easier for a lot of css tasks.

const { List } = require('janus');
const { ListView } = require('janus-stdlib').view.list;
const $ = require('janus-dollar');

class WrapperlessListView extends ListView {
  dom() { return $('<div class="janus-list"/>'); }
  _bindingForItem(item, node, immediate = true) {
    const binding = ListView.prototype._bindingForItem.call(this, item, node, immediate);
    binding.dom = binding.dom.children(':first');
    return binding;
  }
}

module.exports = {
  WrapperlessListView,
  registerWith(library) { library.register(List, WrapperlessListView, { wrap: false }); }
};

