Custom View Render
==================

The standard DomView builder structure doesn't work well _every_ rendering task.
This is true of [Lists](https://github.com/issa-tseng/janus-stdlib/blob/master/src/view/list.coffee),
for example, which is why we've solved the problem for you and provided it in the
Standard Library.

High-performance cases or canvas drawing are other examples. Or, as we'll demonstrate
in our sample code here, if your markup changes per View instance but you still need
to bind mutators into it.

To address these scenarios, you'll need to learn about one more method override
on `View`s: `_render()`. It will be called when the View is expected to produce
an `artifact`, and it should return whatever object represents that View (typically
a jQuery DOM fragment). It will only ever be called once: the result is cached
as the one canonical artifact of the View.

Let's see an example, which in fact is heavily based on the artifact you are
currently looking at: this very article.

~~~
const Article = Model.build();
const Sample = Model.build();

class ArticleView extends DomView {
  _render() {
    const dom = $(this.subject.get_('html'));
    const pointer = this.pointer();
    this._sampleBindings = this.subject.get_('samples').map((sample) => {
      const sampleDom = dom.find(`#sample-${sample.get_('id')}`);
      return mutators.render(from(sample))(sampleDom, pointer);
    });
    return dom;
  }
  _destroy() {
    if (this._sampleBindings != null)
      for (const binding of this._sampleBindings)
        binding.stop();
  }
}

const SampleView = DomView.build($('<code/>'), find('code').text(from('code')));

const app = new App();
app.get_('views').register(Article, ArticleView);
app.get_('views').register(Sample, SampleView);

const article = new Article({
  html: `
    <div class="article">
      <p>This is an article about a useful subject. Here's an example:</p>
      <div id="sample-1"/>
      <p>But here's a more complicated example:</p>
      <div id="sample-2"/>
    </div>`,
  samples: new List([
    new Sample({ id: 1, code: 'console.log("hello, world!");' }),
    new Sample({ id: 2, code: 'console.log("greetings, universe!");' })
  ])
});

return app.view(article);
~~~

So you see, we can still make use of our various tools to accomplish this task.
We can directly invoke `mutators.render` if we know what it wants, and manually
manage the `Observation` tickets we get back from it by implementing our own
`_destroy` handler.

But you can also see that we take some shortcuts here: we blithely assume that
the `html` on the article will never change, nor will the `samples` List instance.
If these are not safe assumptions to make, then we have a lot more homework to
do to create the same kinds of guarantees Janus normally makes.

It'll be incredibly rare that you have to write a custom view, but when you do
don't forget these things: take only the shortcuts you can, and leverage the same
primitive tools you would normally use with a built `DomView` when you can.

