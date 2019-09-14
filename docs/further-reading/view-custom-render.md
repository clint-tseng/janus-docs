Custom View Render
==================

The standard DomView builder structure doesn't work well _every_ rendering task.
This is true of [Lists](https://github.com/issa-tseng/janus-stdlib/blob/master/src/view/list.coffee),
for example, which is why we've solved the problem for you and provided it in the
Standard Library.

High-performance cases or canvas drawing are other examples. Or, as we'll demonstrate
in our sample code here, if each instance of a View has different markup but you
still need to bind mutators into it.

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
      const sampleDom = dom.find(`#sample_${sample.get_('id')}`);
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
      <div>This is an article about a useful subject. Here's an example:</div>
      <div id="sample_1"/>
      <div>But here's a more complicated example:</div>
      <div id="sample_2"/>
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

Attaching to custom-rendered Views
----------------------------------

If you implement your own `_render`, you will need to take extra care around the
usage of [`view#attach`](/further-reading/view-attach). If you don't use the attach
feature, there's nothing to worry about. If you do, however, you'll have implement
your own `_attach`.

One easy way out is to implement `_attach`, but cheat around the problem by just
calling `_render` and fully rerendering the view and its subviews. This is ideal
in cases where there _are_ no subviews, and the work of attaching to what was
rendered is onerous: at least most of your document has been reattached, and you
are only redrawing a few things from scratch.

This is what we do with the Article and its Samples in this codebase.

~~~
const Article = Model.build();
const Sample = Model.build();

class ArticleView extends DomView {
  _render() {
    const dom = $(this.subject.get_('html'));
    this._drawSamples(dom);
    return dom;
  }

  _attach(dom) { this._drawSamples(dom); }

  _drawSamples(dom) {
    const pointer = this.pointer();
    this._sampleBindings = this.subject.get_('samples').map((sample) => {
      const sampleDom = dom.find(`#sample_${sample.get_('id')}`);
      return mutators.render(from(sample))(sampleDom, pointer);
    });
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
      <div>This is an article about a useful subject. Here's an example:</div>
      <div id="sample_1"/>
      <div>But here's a more complicated example:</div>
      <div id="sample_2"/>
    </div>`,
  samples: new List([
    new Sample({ id: 1, code: 'console.log("hello, world!");' }),
    new Sample({ id: 2, code: 'console.log("greetings, universe!");' })
  ])
});

const markup = app.view(article).artifact().clone();
$('#sample-output').append(markup);

const attachingView = app.view(article);
attachingView.attach($('#sample-output').children('.article'));

article.get_('samples').get_(0).set('code', 'hello(world)');
~~~
~~~ target-html
<div id="sample-output"></div>
~~~

Here, we break out the rendering work so we can call it from either path, and then
we set `_attach` up to redraw the samples from scratch. We still avoid redrawing
the entire article as a whole, which in the case of this documentation site is
a significant amount of content. But because the CodeMirror instances we use to
display and edit code samples on this site are not components we can write a reasonable
attachment routine for, we just draw them over again.

Of course, you could take a more subtle approach and actually resume all the appropriate
bindings without overwriting any markup. How you can accomplish this depends heavily
on the exact nature of your custom render. We have some guidelines:

* Relying on the standard Janus primitives as much as possible for your custom
  render will make the attach path easier, and make resource management and cleanup
  more straightforward.
* If you set up `.react`ions as part of your attachment routine, consider whether
  you can pass a `false` immediate to save drawing work on page load. If you can
  trust that the existing markup is fine as-is, and subsequent updates to the data
  will update it appropriately, then you probably can.
* Remember the overall Janus problem-solving philosophy: if you can, treat the
  problem as a data modelling exercise. The more you can structure things into
  predictable data structures, the easier your code will be to reason about.

In the end, attach is a great feature, and one that can improve your page load
time and experience. But it is still a nicety in a lot of ways, and if the presence
of a complex custom drawing routine makes attach prohibitive, it is just fine
in most cases to just bail out and redraw the view.

