const { Model, attribute, bind, List, DomView, template, find, from } = require('janus');
const $ = require('janus-dollar');
const { give } = require('../util/util');

const lineRegex = /^ *at ([^ ]+)(?:[^<]+<anonymous>:(\d+):(\d+))?/;

class StackLine extends Model {
  constructor(line) {
    const parsed = lineRegex.exec(line);
    if (parsed == null) return super();

    const [ , context, lineStr, colStr ] = parsed;
    super({
      context,
      line: parseInt(lineStr) - 3, // TODO: why? i'd expect 1 or maybe 2 but not 3.
      col: parseInt(colStr)
    });
  }
}

const StackLineView = DomView.build($(`
  <div class="stack-line">at
    <span class="stack-line-context"/>
    <a href="#go" class="stack-line-location">
      (line <span class="stack-line-line"/>:<span class="stack-line-col"/>)
    </a>
  </div>`), template(

  find('.stack-line-context').text(from('context')),
  find('.stack-line-line').text(from('line')),
  find('.stack-line-col').text(from('col')),

  find('.stack-line-location')
    .classed('hide', from('line').map(Number.isNaN))
    .on('click', (event, subject) => {
      event.preventDefault();
      $(event.target).trigger('code-navigate', {
        line: subject.get_('line'),
        col: subject.get_('col')
      });
    })
));


const ExceptionViewModel = Model.build(
  attribute('expanded', attribute.Boolean),

  bind('message', from('subject').map((error) => error.message)),
  bind('name', from('subject').map((error) => error.name)),
  bind('stack', from('subject').map((error) =>
    new List(error.stack.split('\n').slice(1).map((x) => new StackLine(x)))))
);

const ExceptionView = DomView.withOptions({ viewModelClass: ExceptionViewModel }).build($(`
  <div class="exception">
    <div class="exception-message"></div>
    <div class="exception-stack"></div>
    <div class="exception-expando"></div>
  </div>`),

  template(
    find('.exception')
      .classGroup('exception-name-', from('name'))
      .classed('expanded', from('expanded'))
      .classed('has-expanded', from('has_expanded')),
    find('.exception-message').text(from('message')),
    find('.exception-stack').render(from('stack')),

    find('.exception-expando').render(from.attribute('expanded'))
      .context('edit')
      .criteria({ attributes: { style: 'button' } })
      .options({ stringify: give('') })
      .on('click', (_, subject) => { subject.set('has_expanded', true); })
  ));


module.exports = {
  StackLine,
  StackLineView,
  ExceptionViewModel,
  ExceptionView,
  registerWith: (library) => {
    library.register(StackLine, StackLineView),
    library.register(RangeError, ExceptionView),
    library.register(ReferenceError, ExceptionView),
    library.register(SyntaxError, ExceptionView),
    library.register(TypeError, ExceptionView),
    library.register(Error, ExceptionView)
  }
};

