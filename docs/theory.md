Janus from First Principles
===========================

The goal of this section is to provide a deep understanding of how each piece of
Janus works, down to some measure of the internals. There are a few reasons we
wish to do this:

1. We want to de-magick the framework. We want it to feel elementary and approachable.
2. We want to instill a sense of the philosophy behind the framework so that
   newcomers to a more functionally-oriented way of problem solving have some
   foundation to start from.
3. We want to lay bare the separate pieces so that you better understand how you
   might leverage them individually in your own work.
4. We want to provide you with the knowledge you need to augment and customize
   the framework to best suit your own needs.

This may sound dry or needless or excessive: a guide to Rails does not include a
deep dive into the internals of ActiveRecord, nor does a jQuery introduction cover
the vagaries of its internal selection management.

Our view is that Janus is actually just a collection of very simple functional
primitives that we happen to have imbued with some default that make them
collectively a potent user interface framework. The more general purpose a tool,
the broader its possibility space and so the deeper the understanding it takes
to use it to its fullest potential: we are not surprised that even the simplest
programming languages require some amount of theoretical study before they may
be properly used.

It is very definitely possible to leverage Janus by copy-and-paste incantation
work. We think it's still an effective tool used this way. But we hope you stick
with this first principles overview, and we promise to keep it as brief and as
interesting as we can.

A Note About the Samples in this Section
========================================

In most of the Janus documentation, including all the First Principles articles,
we automatically import all members of the `janus` package into the local scope,
along with some basics like jQuery `$`. This is to cut down on boilerplate noise
in the samples.

So any time you see some function or class get used out of thin air, it is something
you can import from the `janus` package. In an actual application, you'll want to
`require` these objects yourself.

Next Up
=======

The [first chapter](/theory/origins-and-goals) in this series defines some goals
of the framework, which are then used in the subsequent chapter in the course of
rederiving the basics of Janus from scratch.

