const jInspect = require('janus-inspect');
const { asPanel } = require('../view/context');

// we make our own inspect() that prevents re-inspection.
const inspect = (x) => ((x != null) && ((x.isInspector === true) || (x.isContext === true)))
  ? x
  : jInspect.inspect(x);

// augment inspect with the ability to directly request a panel view.
inspect.panel = (x) => asPanel(inspect(x));

module.exports = { inspect };

