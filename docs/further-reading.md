Further Reading
===============

This is a collection of chapters which explain aspects of Janus that fewer people
will likely need to understand, and so are not discussed in detail in either of
the primary guides.

Of interest also might be the [Cookbook](/cookbook), which focuses on demonstrating
how various common problems are solved in Janus.

Table of Contents
-----------------

When working with `canvas` or other advanced and performance-sensitive elements,
the default set of Janus mutators and bindings may not be well-suited for every
purpose. In these cases, [you'll need to manage Views on your own](/further-reading/view-custom-render).
But the extremely modular, functional, and decentralized construction of Janus
means that falling out of the system in one way does not mean you are suddenly
left in the cold.

If you are rendering application markup on the server side, you may be interested
in [View `.attach`](/further-reading/view-attach), which lets you pick up that
markup as-rendered and attach your client application to it without redrawing
everything.

Finally, the very powerful [`Traversal`](/further-reading/traversal) tool is essentially
Janus-flavored recursive MapReduce for your data structures. Purely functional
and reactive to data changes, you can use Traversals to solve a number of complex
data manipulation problems.

