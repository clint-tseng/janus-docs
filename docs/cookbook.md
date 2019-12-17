A Janus Cookbook
================

The Janus Cookbook is young and small, and not intended to be authoritative or
exhaustive. Rather, because Janus is a somewhat different way of thinking about
interface programming, we want to offer some sample solutions to common interaction
problems to give some sense of the variety of ways to approach these problems.

Application Assembly
--------------------

If you are working on your first Janus application and you're not sure what the
overall structure should be, or how to glue your components together, there are
a few resources for you:

* The [Bootstrapping](/cookbook/application) recipe has some short samples on
  client-only and server/client application assembly.
* The [Practical Guide](/hands-on/and-the-server-too) features a chapter which
  details how server-side rendering works in depth.

Common Interactions
-------------------

Many of these features would normally be accomplished using imported third-party
components or plugins. It is commonly accepted that it is always better to rely
on code that other have already written and tested.

And there is nothing wrong with this philosophy, even within a Janus context. For
this documentation site, we certainly did not build our own code editor (we use
CodeMirror), for example. But more often than not, with its data-driven approach
it is trivial to solve a lot of these little interaction challenges on your own
using a little Janus magic, and then you're not dependent on others to keep code
maintained, to merge your fixes, or to implement the options you need.

* [Drawing flyouts](/cookbook/flyouts) is a useful exercise in managing transient
  interactions, and an opportunity to try out some custom mutators.
* If you need to [drag objects around the screen](/cookbook/draggable), we have a
  particularly tidy and cute machine that does so in a couple dozen lines of rather
  pretty code.

