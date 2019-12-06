A Slice of the Janus Life
=========================

In six relatively short chapters, we've covered a lot of material demonstrating
the basics of Janus functionality. We have covered Views, templates, and Models.
We've discussed how `from` expressions are used as declarations of computation
throughout these different areas.

You've seen how Janus uses many different tools of indirection to help you express
computation as broadly as possible. Whether you're working with Varying, or `from`
expressions, or templates, whether these tools are plugging into `bind`s or `validate`s
or DOM operations, you can express the most important rules of your application
in purely functional terms, free of time and context, and build on those computations
using `.map` and `.flatMap`.

We've shown how Models are not just representations of data, but also little
computation spaces, and how `bind` can be useful for solving tricky problems
involving different input sources. We've also showed a little bit of how dramatically
different ways of structuring your data can affect your code, and how because of
this solving problems in Janus is often a question of figuring out the right way
to model your data.

And hopefully, we've demonstrated how all of the above ideas and principles apply
as well to the modelling of remote resources in Janus: describable as Requests
mapped from local bindings, and resolvable through a layer of indirection to promote
reuse and multi-context execution.

What Did We Miss?
-----------------

There are three practical subjects we didn't cover as part of this tour:

1. Janus is plenty performant and efficient in all typical circumstances without
   requiring too much attention on things like resource usage and memory management.
   Part of this is because it works pretty hard internally to be as lazy and efficient
   as possible. Those resource management tools are [available for your use as
   well](/theory/resource-management).
2. We didn't spend much time on Lists, because most people are used to working
   with them, and there isn't too much that's surprising about Janus Lists. But
   if you want to add functionality to them, it's worth reading about [how the
   various derived Lists work](/theory/lists#list-internals).
3. When working with `canvas` or other advanced and performance-sensitive elements,
   the default set of Janus mutators and bindings may not be well-suited for every
   purpose. In these cases, [you'll need to manage Views on your own](/further-reading/view-custom-render).
   But the extremely modular, functional, and decentralized construction of Janus
   means that falling out of the system in one way does not mean you are suddenly
   left in the cold.

A Deeper Understanding
----------------------

And that final point is probably the most crucial characteristic of Janus that
is largely missed by this practical guide: a deep understanding of the primitives
you are directly handling when you write the code we've shown so far.

It is incredibly important that Janus should not feel like magical incantation.
The framework is little more than a handful of very elemental, understandable
primitives carefully shaped to fit together in harmonious ways. You can and should
be using them in solo or in concert.

And it is this aspect that is most emphasized in the theoretical guide and absent
from this practical approach: a focus on building an understanding of the fundamental
building blocks of Janus, and how they actually work. Every mechanism in Janus is
carefully designed to withstand and encourage customization and reformulation.

And so if you haven't yet, we highly encourage you to go take a look at the [theory
chapters](/theory) explaining everything you've seen from the ground up.

Either way, we're sure you'll do amazing things and go far with Janus. Good luck,
and we're excited to see where you go.

