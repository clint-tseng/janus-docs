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

// we do a little bit of weird cheatwork here so that we fully display: none
thoughts.watchLength().map((active) => active > 0).react((thinking) => {
  thinker.toggleClass('thinking', thinking);
});

module.exports = { think };

