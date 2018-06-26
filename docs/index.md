<p class="splash">
Janus is a functional, reactive Javascript framework which makes realizing complex
user interfaces safe and easy. Modular but opinionated, Janus is built on a strong
formal base but provides powerful, familiar building blocks.
</p>

Rather than wax poetic on what we&rsquo;re about, we&rsquo;ll let the code speak for
itself. Each of the following sections demonstrates a major framework component.

Views and Templating
--------------------

~~~
const kerbonaut = new Model({
  name: { first: 'Jebediah', last: 'Kerman' }
});

const KerbonautCard = DomView.build(
  $('<div class="greeting"/>'),

  template(
    find('.greeting').text(
      from('name.first').and('name.last')
        .all.map((first, last) => `Hi, I'm ${first} ${last}!`))
  )
);

return new KerbonautCard(kerbonaut);
~~~

Janus is just plain HTML and Javascript. There are no goofy custom tags, there is no
templating language syntax to learn and compile. Instead, we use selectors and a binding
syntax based on the jQuery API&mdash;things you already understand and rely upon.

~~~
const Kerbonaut = Model.build(
  attribute('name.first', attribute.Text),
  attribute('name.last', attribute.Text)
);

const KerbonautEditor = DomView.build($(`
  <div class="kerbonaut-editor">
    <div class="first-name"/>
    <div class="last-name"/>
  </div>`),

  template(
    find('.first-name').render(from.attribute('name.first')).context('edit'),
    find('.last-name').render(from.attribute('name.last')).context('edit')
  )
);

const kerbonaut = new Kerbonaut({
  name: { first: 'Jebediah', last: 'Kerman' }
});
return new KerbonautEditor(kerbonaut);
~~~
~~~ postprocess
const KerbonautCard = DomView.build($('<div class="greeting"/>'), template(
  find('.greeting').text(from('name.first').and('name.last').all.map((first, last) => `Hi, I'm ${first} ${last}!`))
));
return [ arg, new KerbonautCard(arg.subject) ];
~~~

Of course, the previous example isn't very interesting with static data. Here we rig
up a basic Model definition and edit view to go along with our card view.

