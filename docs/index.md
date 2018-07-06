<p class="splash">
Janus is a functional, reactive Javascript framework which makes realizing complex
user interfaces safe and easy. Modular but opinionated, Janus is built on a strong
formal base but provides powerful, familiar building blocks.
</p>

Rather than wax poetic on what we&rsquo;re about, we&rsquo;ll let the code speak for
itself. Each of the following sections demonstrates a major framework component.

Views and Templating
--------------------

Janus is just plain HTML and Javascript. There are no goofy custom tags, there is no
templating language syntax to learn and compile. Instead, we use selectors and a binding
syntax based on the jQuery API&mdash;things you already understand and rely upon.

~~~
const dog = new Model({ name: 'Spot', age: 3 });

const DogTag = DomView.build($(`
  <div class="dog-tag">
    Hi! I'm <span class="name"/>!
    I'm <span class="age"/> years old.
    That's <span class="human-age"/> in human years!
  </div>`),

  template(
    find('.name').text(from('name')),
    find('.age').text(from('age')),
    find('.human-age').text(from('age').map((age) => age * 7))
  )
);

return new DogTag(dog);
~~~

Of course, the previous example isn't very interesting with static data. Here we rig
up a basic Model definition and edit view. The `.render()` call looks at the given
object and inserts an appropriate view for it&mdash;in this case, from the Janus
[standard library](/stdlib):

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
const mapped = list.map((x) => x * 2);
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

const [ list, mapped ] = arg.result;
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
    values() { return [ 'dog', 'cat', 'rabbit', 'hamster', 'iguana', 'parrot', 'fish' ]; }
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
  new Pet({ name: 'Flutters', kind: 'parrot' })
]);
const editors = pets.map((pet) => new PetEditor(pet));
const dogNames = pets
  .filter((pet) => pet.watch('kind').map((kind) => kind === 'dog'))
  .flatMap((pet) => pet.watch('name'));

return [ editors, dogNames ];
~~~

Janus collections support key enumeration, which can be a powerful tool. Again,
all enumerations and traversals can be declared once and changes are automatically
maintained. Consider, for instance, a user-defined custom metadata bag:

~~~
const widget = new Model({
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

return widget.enumeration()
  .flatMap((key) => widget.watch(key)
    .map((value) => `${key}: ${value}`));
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

const changed = shadow.watchModified().map((modified) => `Changed: ${modified}`);

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

const TodoList = DomView.build($(`
  <div class="todo-list">
    <span class="completed"/> of <span class="total"/> items done
    <div class="items"/>
    <a href="#add" class="add">Add Item</a>
  </div>`), template(

  find('.completed').text( from('items').flatMap((items) =>
    items.filter((item) => item.watch('done')).watchLength())),

  find('.total').text(from('items').flatMap((items) => items.watchLength())),

  find('.items').render(from('items')),

  find('.add').on('click', (event, subject) => {
    event.preventDefault();
    subject.get('items').add(new Item());
  })
));

views.register(Item, ItemView);
return new TodoList(new Model({ items: new List() }));
~~~

~~~ styles
.todo-item .description.done input { text-decoration: line-through; }
~~~

A fancier, more complete Todo list can be found in the [samples
repository](https://github.com/clint-tseng/janus-samples/tree/master/todo).

A Closer Look
-------------

For more information about Janus, please take a look at the following resources:

* There are two different [introduction guides](/intro) available.
  One is a more practical guide for those who learn best by doing, while the other
  builds more comprehensively up from principles and elements.
* The [Janus Samples](https://github.com/clint-tseng/janus-samples) contains
  complete example projects that show Janus in use in context.
* The [cookbook](/cookbook) is a compendium of common problems and answers that
  serve as a quick solutions reference, but also illustrate how to approach
  problem-solving in Janus.

