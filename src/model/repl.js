const $ = require('janus-dollar');
const janus = require('janus');
const stdlib = require('janus-stdlib');
const { parse } = require('cherow');

const { Map, Model, attribute, dēfault, bind, from, List, Varying } = janus;
const { compile, success, fail, inert, Env } = require('../util/eval');
const { blank, nonblank } = require('../util/util');
const { inspect } = require('../util/inspect');

const rootEnv = Object.assign({ $, stdlib, inspect }, janus);


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
      //this.set('result', fail(ex)); // TODO: give the option of showing this
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
        const env = { base: this.get_('env.base') };
        additional.push(new Statement({
          statements, name, env, code: code.substring(right.start, right.end)
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
    const context = Object.assign({}, this.get_('env.base'));
    for (const statement of this.get_('statements')) {
      if (statement === this) break;

      const name = statement.get_('name');
      if (blank(name)) continue;

      const result = statement.get_('result');
      if (success.match(result)) context[name] = result.getSuccess();
    }

    // build an environment, and compile and run our final code:
    const env = new Env(context);
    this.set('env.final', env); // save this for other purposes.

    const compiled = compile(env, `return ${this.get_('code')};`);
    try { this.set('result', compiled.flatMap((f) => f())); }
    catch(ex) { this.set('result', fail(ex)); }
  }
}

class Reference extends Statement {
  commit() {}
  run() {}
}

class Repl extends Model.build(
  attribute('statements', attribute.List.withDefault()), // ref immutative
  dēfault.writing('env.inject', {}),

  attribute('pins', attribute.List.withDefault())
) {
  _initialize() {
    this.set('env.base', new Env(rootEnv, this.get_('env.inject')));
    this.createStatement();
  }

  createStatement() {
    const statements = this.get_('statements');
    const statement = new Statement({ statements, env: { base: this.get_('env.base') } });
    statements.add(statement);
    return statement;
  }

  transfer(code) {
    const last = this.get_('statements').get_(-1);
    const target = blank(last.get_('code')) ? last : this.createStatement();

    // TODO: send this through cherow insetad.
    const dereturned = code.replace(/(?:\n|^)(?:\s*)return ([^\n]+)(?:$|\n)/, '$1');

    target.set('code', dereturned);
    target.commit();
    this.createStatement();
  }

  reference(obj) {
    const ref = new Reference({ result: success(obj) });
    const statements = this.get_('statements');
    if (blank(statements.get_(-1).get_('code'))) {
      statements.add(ref, -1);
    } else {
      statements.add(ref);
      this.createStatement();
    }
  }
}

module.exports = { Statement, Reference, Repl };

