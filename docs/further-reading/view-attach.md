View `attach()`
===============

One of the more subtly powerful tools in the Janus toolkit is `view.attach(dom)`.
Attachment is the sole reason you've seen the `immediate` parameter get piped
around this whole time.

`attach` allows you to create a View and attach it to an already-rendered DOM
fragment, rather than generate its own fragment. Mutators will get bound against
the extant fragment, and events will get wired just as usual, but the initial
state of the fragment is assumed to be already up-to-date with the latest model
values, and no mutations will occur until data actually changes.

> After all, if we attached to an existing fragment but then immediately clobbered
> its contents, which would involve re-rendering child views, there wouldn't be
> much point!

The key use of this functionality is to be able to pick up server-rendered markup
on the client side and resume maintaining it without having to first wipe the
slate clean and re-render everything.

You can perhaps spot how `immediate` fits this task. You will recall (hopefully)
that calling `varying.react(false, (x) => { … })` will begin running the reaction
callback only on the _next_ value change for the Varying. So by basing all our
mutators on this resolution syntax…

~~~ noexec
(data) => (dom, point, immediate = true) => data.all.point(point).react(immediate, …)
~~~

…which you saw at the top of this article, all that's left is to pass `false`
for `immediate`, and we have a free and easy `view.attach(dom)` method.

> Okay, it's not that easy. The `render` mutator, in particular, needs to work
> a little bit differently because while it doesn't want to _change_ the rendered
> child view right away it still has to carry the `attach` operation all the way
> down through the view tree.

TODO: a sample.

This does mean, however, that if you have implemented a custom `_render` View
as described in the previous section, you'll have a little more work to do if
you want to use `attach`: you'll have to implement `_attach(dom) {}`, which will
need to work exactly like `_render` except it'll have to use the given `dom` rather
than generate its own. It isn't expected to return anything, and it should ideally
(but optionally) itself pass `immediate = false` as appropriate to any mutators
or `.react`s it performs to cascade the attach operation all the way down the tree.

