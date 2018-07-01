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
    Hi! I'm <span class="dog-name"/>!
    I'm <span class="dog-age"/> years old.
    That's <span class="dog-human-age"/> in human years!
  </div>`),

  template(
    find('.dog-name').text(from('name')),
    find('.dog-age').text(from('age')),
    find('.dog-human-age').text(from('age').map((age) => age * 7))
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
    <div class="todo-items"/>
    <a href="#add" class="todo-add">Add Item</a>
  </div>`), template(

  find('.todo-items').render(from('items')),
  find('.todo-add').on('click', (event, subject) => {
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

Data Structures and Models
--------------------------

Janus provides a unique data structure library. All collection transformations
in Janus handle changes over time, so that you don't have to. Here is a simple
example:

~~~
const list = new List([ 4, 8, 15, 16, 23, 42 ]);


~~~

