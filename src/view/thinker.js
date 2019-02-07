// not a standard view! used in src/model/app.js.
const { List, types } = require('janus');
const $ = require('janus-dollar');

const thinker = $('#thinker');

const thoughts = new List();
const think = (thought) => {
  thoughts.add(thought);
  thought.react(function(x) {
    if (types.result.complete.match(x)) {
      thoughts.remove(thought);
      this.stop();
    }
  });
};

thoughts.nonEmpty().react((thinking) => { thinker.toggleClass('thinking', thinking); });

module.exports = { think };

