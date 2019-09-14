View `attach()`
===============

One of the more subtly powerful tools in the Janus toolkit is `view.attach(dom)`.
Attachment is the sole reason you [see](/theory/views-templates-mutators) the
`immediate` parameter get piped around the templating and mutator code.

`attach` allows you to create a View instance and attach it to an already-rendered
DOM fragment, rather than let it generate its own fragment. Mutators will get bound
against the extant fragment, and events will get wired just as usual, but the initial
state of the fragment is assumed to be already up-to-date with the latest model
values, and no mutations will occur until data actually changes.

> After all, if we attached to an existing fragment but then immediately clobbered
> its contents, which would involve re-rendering child views, there wouldn't be
> much point!

The key use of this functionality is to be able to pick up server-rendered markup
on the client side and resume maintaining it without having to first wipe the
slate clean and re-render everything.

You can perhaps spot how `immediate` fits this task. You will recall (hopefully)
that calling `varying.react(false, x => { … })` will begin running the reaction
callback only on the _next_ value change for the Varying. So by basing all our
mutators on this resolution syntax…

~~~ noexec
(data) => (dom, point, immediate = true) => data.all.point(point).react(immediate, …)
~~~

…which [is the signature](/theory/views-templates-mutators) of all mutators,
then all that's left is to pass `false` for `immediate`, and we have a free and
easy `view.attach(dom)` method.

> Okay, it's not that easy. The `render` mutator, in particular, needs to work
> a little bit differently because while it doesn't want to _change_ the rendered
> child view right away it still has to carry the `attach` operation all the way
> down through the view tree.

This does mean, however, that if you have [implemented a custom `_render` View](/further-reading/view-custom-render),
you'll have a little more work to do if you want to use `attach`. There are more
details about this in the linked article.

Applying attach
---------------

So, how do you actually put attach to use?

We [generally suggest](TODO) an application structure with a root Model and View
from which the entire application can render. This means the client-side initialization
code of your application will probably look a little like this:

~~~ noexec
const model = RootModel({ …data… });
const view = app.view(model);
$('#app').append(view.artifact());
view.wireEvents();
~~~

If you have the same data at hand on the client as you do on the server, and you're
using standard Janus DomView tools (`template`, `find`, `from`, etc), all you need
to do is change one line:

~~~ noexec
const model = RootModel({ …data… });
const view = app.view(model);
view.attach($('#app').contents());
view.wireEvents();
~~~

That's it. Of course, there is the matter of ensuring that you have exactly the
same data on the client as was used by the server, or else strange things can
occur. Remember, the whole point is to blindly assume that everything is already
the way it ought to be, and avoid any initial work. The [`fromDom`](/api/resolver#λfromDom)
resolver is one way to accomplish this; another is to use the emerging HTTP/2
push feature.

In the case of this documentation application, we really only have `Article`s to
worry about. So we write our own caching layer that's populated manually by our
static site generation script. If you have some understanding of how the [resolver
system](/theory/requests-resolvers-references) works, you should be able to come
up with your own solution as well.

