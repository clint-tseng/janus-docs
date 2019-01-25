const jInspect = require('janus-inspect');
const { withContext } = require('../view/context');

// we make our own inspect() that prevents re-inspection.
const inspect = (x) => ((x != null) && ((x.isInspector === true) || (x.isContext === true)))
  ? x
  : jInspect.inspect(x);

// augment inspect with the ability to directly request a panel view.
inspect.panel = (x) => withContext(inspect(x), 'panel');

module.exports = { inspect };

