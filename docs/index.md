<p class="splash">
Janus is a functional, reactive Javascript framework which makes complex user
interfaces safe and easy to realize. <span class="splash-two">Modular but
opinionated, Janus is built on a strong formal base but provides powerful,
familiar building blocks.</span>
</p>

Janus is built around a <em>declare-once, work-forever</em> philosophy. It
provides easy-to-use but powerful tools for describing data transformations,
bindings, and actions. Janus does the work of making sure those
declarations&mdash;your rules&mdash;remain true whenever your data changes.
It features:

<div class="feature">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M48.7418,51,33.82,19a3.6051,3.6051,0,0,0-2.9326-2h-5A3.6051,3.6051,0,0,1,28.82,19L43.7418,51a3.6051,3.6051,0,0,0,2.9326,2h5A3.6051,3.6051,0,0,1,48.7418,51Z"/><path d="M34.1434,30,23.8846,52a1.8026,1.8026,0,0,1-1.4663,1h4.5L37.6434,30Z"/><path d="M70.071,34.1135,55.6243,19.6668,53.3614,21.93,65.4647,35.649,53.3375,50.6677l1.6251,1.6251L70.071,37.1844A2.1709,2.1709,0,0,0,70.071,34.1135Z"/><path d="M2.849,37.8461,17.2957,52.2928l2.263-2.263L7.4553,36.3106,19.5825,21.2919l-1.6251-1.6251L2.849,34.7752A2.1709,2.1709,0,0,0,2.849,37.8461Z"/></svg>
<h2>Templated View Components</h2>
<p>
A simple, extensible views and templating library that uses plain HTML and
Javascript with familiar, jQuery-like syntax.
<a href="#views-and-templating">See examples</a>.
</p>
</div>

<div class="feature">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M35.75,38.3174l-13.25-7.65v-15.3l13.25-7.65L49,15.3677v15.3ZM25.5,28.9351l10.25,5.9184L46,28.9351V17.1L35.75,11.1816,25.5,17.1Z"/><path d="M50.75,63.3174,37.5,55.668V40.3672l13.25-7.6494L64,40.3672V55.668ZM40.5,53.9355l10.25,5.917L61,53.9355V42.1l-10.25-5.918L40.5,42.1Z"/><path d="M20.75,63.3174,7.5,55.668V40.3672l13.25-7.6494L34,40.3672V55.668ZM10.5,53.9355l10.25,5.917L31,53.9355V42.1l-10.25-5.918L10.5,42.1Z"/></svg>
<h2>Collections and Model Library</h2>
<p>
Core structures which treat data operations like <code>map</code> as declarative
transformation rules which should always hold true, rather than as individual
point-in-time mutations. <a href="#data-structures-and-models">See examples</a>.
</p>
</div>

<div class="feature">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><path d="M36.5,12A23.5,23.5,0,1,1,13,35.5,23.5,23.5,0,0,1,36.5,12m0-3A26.5,26.5,0,1,0,63,35.5,26.5,26.5,0,0,0,36.5,9Z"/><path d="M36.5,12a11.75,11.75,0,0,1,0,23.5,11.75,11.75,0,0,0,0,23.5,23.5,23.5,0,0,0,0-47Z"/></svg>
<h2>Application Layer</h2>
<p>
The tools you need to assemble these components into a full application, including
the ability to render server- and client-side with the same codebase.
</p>
</div>

Below are some small code samples to give you a sense for what Janus looks like.
They are simple, but they are fully representative of real-world Janus code.

Views and Templating
--------------------

Janus is just plain HTML and Javascript. There are no goofy custom tags, there is
no templating language syntax to learn and compile. Instead, we use selectors and
a binding syntax based on the jQuery API&mdash;things you already understand and
rely upon.

~~~
const dog = new Map({ name: 'Spot', age: 3 });

const DogTag = DomView.build($(`
  <div class="dog-tag">
    Hi! I'm <span class="name"/>!
    I'm <span class="age"/> years old.
    That's <span class="human-age"/> in human years!
  </div>`),

  template(
    find('.name').text(from('name')),
    find('.age').text(from('age')),
    find('.human-age').text(from('age').map(age => age * 7))
  )
);

return new DogTag(dog);
~~~

Of course, the previous example isn't very interesting with static data. Here we rig
up a basic Model definition and edit view. The `.render()` call looks at the given
object and inserts an appropriate view for it&mdash;in this case, from the Janus
[standard library](/api/stdlib):

~~~
const Dog = Model.build(
  attribute('name', attribute.Text),
  attribute('age', attribute.Number)
);

const DogEditor = DomView.build($(`
  <div class="dog-editor">
    <div class="name"/>
    <div class="age"/>
    <div class="info"/>
  </div>`),

  template(
    find('.name').render(from.attribute('name')).context('edit'),
    find('.age').render(from.attribute('age')).context('edit'),
    find('.info').text(from('name').and('age')
      .all.map((name, age) => `${name} is ${age * 7} in human years.`))
  )
);

const dog = new Dog({ name: 'Spot', age: 3 });
return new DogEditor(dog);
~~~

Data Structures and Models
--------------------------

Janus provides a unique data structure library. All collection transformations
in Janus handle changes over time, so that you don't have to. Here is a simple
example:

~~~
const list = new List([ 4, 8, 15, 16, 23, 42 ]);
const mapped = list.map(x => x * 2);
return [ list, mapped ];

// add: list.add(list.at(-1) + list.at(-2))
// remove: list.removeAt(-1)
~~~

~~~ postprocess
const SampleView = DomView.build($(`
  <div id="list-sample-1">
    <div class="list-container"/>
    <div class="list-controls">
      <a class="list-add" href="#add">Add</a>
      <a class="list-remove" href="#remove">Remove</a>
    </div>
    <hr/>
    <div class="mapped-container">
  </div>`), template(

  find('.list-container').render(from('list')),
  find('.mapped-container').render(from('mapped')),

  find('.list-add').on('click', (event, subject) => {
    event.preventDefault();
    const list = subject.get('list');
    if (list.length >= 2)
      list.add(list.at(-1) + list.at(-2));
    else
      list.add(1);
  }),

  find('.list-remove').on('click', (event, subject) => {
    event.preventDefault();
    subject.get('list').removeAt(-1);
  })
));

const [ list, mapped ] = __arg;
return new SampleView(new Model({ list, mapped }));
~~~

~~~ styles
#list-sample-1 { overflow: hidden; }
#list-sample-1 li {
  float: left;
  padding: 0 0.5em;
}
~~~

Common array operations are all supported, such as `.filter()`, as shown here.
And as you can see, changes in the result of the lambda function will result
in automatic changes to the list. Here, we allow named and typed pets, and we
display a list of just the names of dogs.

~~~
const Pet = Model.build(
  attribute('name', attribute.Text),
  attribute('kind', class extends attribute.Enum {
    values() { return [ 'dog', 'cat', 'rabbit', 'hamster', 'iguana', 'parrot' ]; }
  }));

const PetEditor = DomView.build(
  $('<div class="pet"><span class="name"/><span class="kind"/></div>'),
  template(
    find('.name').render(from.attribute('name')).context('edit'),
    find('.kind').render(from.attribute('kind')).context('edit')
  ));

const pets = new List([
  new Pet({ name: 'Kenka', kind: 'dog' }),
  new Pet({ name: 'Gertrude', kind: 'cat' }),
  new Pet({ name: 'Maizie', kind: 'dog' }),
  new Pet({ name: 'Widget', kind: 'cat' }),
  new Pet({ name: 'Squawks', kind: 'parrot' })
]);
const editors = pets.map(pet => new PetEditor(pet));
const dogNames = pets
  .filter(pet => pet.get('kind').map(kind => kind === 'dog'))
  .flatMap(pet => pet.get('name'));

return [ editors, dogNames ];
~~~

Janus collections support key enumeration, which can be a powerful tool. Again,
all enumerations and traversals can be declared once and changes are automatically
maintained. Consider, for instance, a user-defined custom metadata bag:

~~~
const widget = new Map({
  id: 1138,
  name: 'Important Widget',
  metadata: {
    custom1: 'a way',
    custom2: 'a lone',
    custom3: 'a last',
    custom4: 'a loved',
    custom5: 'a long'
  }
});

return widget.keys()
  .flatMap(key => widget.get(key).map(value => `${key}: ${value}`));
~~~

Another example of enumeration involves the shadow-copy feature of Maps and Models.
Using enumeration-based traversal, our collections can provide features like
advanced serialization, or, as seen here, deep change detection.  

~~~
const NamedModel = Model.build(attribute('name', attribute.Text));

const model = new NamedModel({
  name: 'A model',
  child: new NamedModel({ name: 'A child model' })
});
const shadow = model.shadow();

const Editor = DomView.build(
  $('<div><div class="name"/><div class="child-name"/></div>'),
  template(
    find('.name').render(from.attribute('name')).context('edit'),
    find('.child-name').render(from('child').attribute('name')).context('edit')
  ));

const changed = shadow.modified().map(modified => `Changed: ${modified}`);

return [ new Editor(shadow), changed ];
~~~

A Simple Application
--------------------

Here we create the classic Todo list sample. We define a model and a view for
`Item`, then render a list of them. Notice how simple the event handling is:
we just manipulate the data. Everything else, including the list management,
is automatically handled.

~~~
const Item = Model.build(
  attribute('done', attribute.Boolean),
  attribute('description', attribute.Text)
);
const Main = Model.build();

const ItemView = DomView.build($(`
  <div class="todo-item">
    <span class="done"/>
    <span class="description"/>
    <a class="remove" href="#remove">x</a>
  </div>`), template(

  find('.done').render(from.attribute('done')).context('edit'),

  find('.description')
    .classed('done', from('done'))
    .render(from.attribute('description')).context('edit'),

  find('.remove').on('click', (event, subject) => {
    event.preventDefault();
    subject.destroy();
  })
));

const TodoListView = DomView.build($(`
  <div class="todo-list">
    <span class="completed"/> of <span class="total"/> items done
    <div class="items"/>
    <a href="#add" class="add">Add Item</a>
  </div>`), template(

  find('.completed').text(from('items').flatMap(items =>
    items.filter(item => item.get('done')).length)),

  find('.total').text(from('items').flatMap(items => items.length)),

  find('.items').render(from('items')),

  find('.add').on('click', (event, subject) => {
    event.preventDefault();
    subject.get_('items').add(new Item());
  })
));

const app = new App();
stdlib.view.registerWith(app.get_('views'));
app.get_('views').register(Item, ItemView);
app.get_('views').register(Main, TodoListView);
const view = app.view(new Main({ items: new List() }));
view.wireEvents();
return view;
~~~

~~~ styles
.todo-item .description.done input { text-decoration: line-through; }
~~~

A fancier, more complete Todo list can be found in the [samples
repository](https://github.com/clint-tseng/janus-samples/tree/master/todo).

A Closer Look
-------------

For more information about Janus, please take a look at the following resources:

* The [introduction](/intro) walks through the general setup and explains each
  component we ship in greater detail.
* There are two different introductory guides available. One is a more [practical
  how-to](/hands-on) for those who want to just get coding and learn best by doing,
  while the [first principles](/theory) section builds a deeper picture of the hows
  and whys from motivations and principles.
* The [cookbook](/cookbook) is a compendium of common problems and answers that
  serve as a quick solutions reference, but also illustrate how to approach
  problem-solving in Janus.
* The [Janus Samples](https://github.com/clint-tseng/janus-samples) repository
  contains complete example projects that show Janus in use in context.

