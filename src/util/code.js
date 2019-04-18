const { parse } = require('cherow');
const { blank } = require('../util/util');

// recursive helper for atomize below.
// one case we don't (yet?) account for is sequence expressions mixing assignment
// and other statements; for example:
// myvar = 4, f(), yourvar = 6;
const _atomize = (nodes) => {
  const result = [];
  for (const node of nodes) {
    // first, our recursive cases.
    if ((node.type === 'ExpressionStatement') &&
      (node.expression.type === 'SequenceExpression') &&
      (node.expression.expressions.every((e) => e.type === 'AssignmentExpression')))
      Array.prototype.push.apply(result, _atomize(node.expression.expressions));
    else if (node.type === 'VariableDeclaration')
      Array.prototype.push.apply(result, _atomize(node.declarations));

    // then, our atomic ones.
    else if ((node.type === 'ExpressionStatement') &&
      (node.expression.type === 'AssignmentExpression'))
      result.push([ node.expression.left, node.expression.right ]);
    else if (node.type === 'AssignmentExpression')
      result.push([ node.left, node.right ]);
    else if (node.type === 'VariableDeclarator')
      result.push([ node.id, node.init ]);
    else
      result.push([ null, node ]);
  }
  return result;
};

// atomizes the code. this splits statements apart, and splits assignments
// if present. it returns either false, or an ast tree.
const atomize = (code) => {
  if (blank(code)) return false; // if no code, do nothing.

  let tree; // es6 is the best
  try {
    tree = parse(code, { ranges: 'index' });
  } catch(ex) { // TODO: return + show what the exception is?
    return false; // if we don't compile, bail and allow newline.
  }

  // again, if there is no code, do nothing. otherwise, process and return.
  return (tree.body.length === 0) ? false : _atomize(tree.body);
};

module.exports = { atomize };

