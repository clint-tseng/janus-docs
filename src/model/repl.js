const $ = require('janus-dollar');
const janus = require('janus');
const stdlib = require('janus-stdlib');
const { inspect } = require('janus-inspect');

const { Map, Model, attribute, dēfault, bind, from, List, Varying } = janus;
const { compile, success, fail, inert, Env } = require('../util/eval');
const { nonblank } = require('../util/util');

const and = (x, y) => x && y;
const baseEnv = Object.assign({ $, stdlib, inspect }, janus);

class Statement extends Model.build(
  dēfault('active', false),
  attribute('code', attribute.Text),
  // identifiers: List[str]
  attribute('name', attribute.Text),
  // seqId: int

  bind('named', from('name').map(nonblank)),

  // build the context of all previous named results given the full context
  // map and the list of available identifiers.
  bind('context.pairs', from('statements').and('seqId').all.map((statements, seqId) =>
    statements
      .take(seqId)
      .filter((statement) => Varying.mapAll(and,
        statement.watch('named'),
        statement.watch('result').map(success.match)))
      .flatMap((statement) =>
        Varying.mapAll(statement.watch('name'), statement.watch('result'),
          (name, result) => ({ [name]: result.getSuccess() }))))),

  // TODO: the de/restructuring hurts.
  bind('context.obj', from('context.pairs').flatMap((pairs) =>
    pairs.apply((...objs) => new Env(Object.assign({}, ...objs))))),

  bind('env', from('context.obj').map((context) => new Env(Object.assign({}, baseEnv, context)))),

  // see if we want to munge a name out of it:
  bind('preprocessed', from('code').map((code) => {
    const match = /^\s*(?:(?:const|var|let) )?\s*([a-z0-9-_$]+)\s*=\s*/i.exec(code);
    return (match == null) ? { code } : { name: match[1], code: code.slice(match[0].length) };
  })),

  bind('precompiled', from('preprocessed.code').map((code) => `return ${code}`)),
  bind('compiled', from('env').and('precompiled').all.map(compile)),
  bind('result', from('compiled').map((compiled) => compiled.flatMap((f) => f())))
) {
  commit() {
    // do nothing if we've already committed:
    if (this.get('active') === true) return false;

    // do nothing if we do not compile:
    if (!success.match(this.get('compiled'))) return false;

    // going through with it.
    // commit our preprocessor munges:
    this.set('name', this.get('preprocessed.name'));
    this.set('code', this.get('preprocessed.code'));

    this.set('active', true);
    return true;
  }
}

class Repl extends Model.build(
  dēfault.writing('statements', new List()) // ref immutative
) {
  _initialize() {
    this.createStatement();
  }

  createStatement() {
    const statements = this.get('statements');
    const seqId = statements.length;

    const statement = new Statement({ seqId, statements });

    statements.add(statement);
    return statement;
  }

  commit() { this.createStatement(); }
}

module.exports = { Statement, Repl };

