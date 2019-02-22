const $ = require('janus-dollar');
const janus = require('janus');
const stdlib = require('janus-stdlib');
const { parse } = require('cherow');

const { Map, Model, attribute, dēfault, bind, from, List, Varying } = janus;
const { compile, success, fail, inert, Env } = require('../util/eval');
const { blank, nonblank } = require('../util/util');
const { inspect } = require('../util/inspect');

const baseEnv = Object.assign({ $, stdlib, inspect }, janus);


// one case we don't (yet?) account for is sequence expressions mixing assignment
// and other statements; for example:
// myvar = 4, f(), yourvar = 6;
const atomize = (nodes) => {
  const result = [];
  for (const node of nodes) {
    // first, our recursive cases.
    if ((node.type === 'ExpressionStatement') &&
      (node.expression.type === 'SequenceExpression') &&
      (node.expression.expressions.every((e) => e.type === 'AssignmentExpression')))
      Array.prototype.push.apply(result, atomize(node.expression.expressions));
    else if (node.type === 'VariableDeclaration')
      Array.prototype.push.apply(result, atomize(node.declarations));

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


// so, this used to be a beautiful purely functional databound process, which
// meant that statements all re-evaluated as necessary as edits were made. but
// i was unable to answer the questions "if a repl statement is impure, do we
// rerun that too? if not, how do we know it's impure?" such that the result
// seemed usable without an instruction manual. so now we have this chunky
// imperativeness instead. c'est la vie. :/
class Statement extends Model.build(
  attribute('name', attribute.Text),
  attribute('code', attribute.Text),
  bind('named', from('name').map(nonblank))
) {
  commit() {
    const code = this.get_('code');
    if (blank(code)) return false; // if no code, do nothing.

    let tree;
    try {
      tree = parse(code, { ranges: 'index' });
    } catch(ex) {
      //this.set('result', fail(ex));
      return false; // if we don't compile, bail and allow newline.
    }

    // again, if there is no code, do nothing.
    if (tree.body.length === 0) return false;

    // atomize the code. this splits statements apart, and splits assignments
    // if present.
    const atomized = atomize(tree.body);
    const own = atomized.shift();
    if (own[0] != null) {
      // our own statement has an assignment. regardless what we had already for
      // our name binding, clobber it with what's now been provided.
      const [ left, right ] = own;
      this.set('name', code.substring(left.start, left.end));
      this.set('code', code.substring(right.start, right.end));
    }

    const additional = [];
    if (atomized.length > 0) {
      const statements = this.get_('statements');
      // we have additional statements that have been split off. add them following
      // this one, and assign the name/code bindings appropriately as we do so.
      for (const [ left, right ] of atomized) {
        const name = (left == null) ? null : code.substring(left.start, left.end);
        additional.push(new Statement({
          statements, name, code: code.substring(right.start, right.end)
        }));
      }
      statements.add(additional, statements.list.indexOf(this) + 1);
    }

    // now, run our own code:
    this.run();

    // and then, if relevant, run the split-out statements that got added. we just
    // did all the parsing work so it's safe to just run it without commit.
    for (const statement of additional) statement.run();

    return true; // regardless of runtime errors, we at least tried to run. return true.
  }

  run() {
    // build a context of previous statement bindings.
    const context = Object.assign({}, baseEnv);
    for (const statement of this.get_('statements')) {
      if (statement === this) break;

      const name = statement.get_('name');
      if (blank(name)) continue;

      const result = statement.get_('result');
      if (success.match(result)) context[name] = result.getSuccess();
    }

    // build an environment, and compile and run our final code:
    const env = new Env(context);
    const compiled = compile(env, `return ${this.get_('code')};`);
    this.set('result', compiled.flatMap((f) => f()));
  }
}

class Repl extends Model.build(
  dēfault.writing('statements', new List()), // ref immutative

  attribute('pins', class extends attribute.List {
    default() { return new List(); }
  })
) {
  _initialize() {
    this.createStatement();
  }

  createStatement() {
    const statements = this.get_('statements');
    const statement = new Statement({ statements });
    statements.add(statement);
    return statement;
  }

  commit() { this.createStatement(); }
}

module.exports = { Statement, Repl };

