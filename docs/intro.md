Getting to know Janus
=====================

Janus is a web interface framework built around a declare-once, work-forever
philosophy. It emphasizes pragmatic purity: we encourage purely functional
programming by presenting a friendly, familiar API and embracing imperative code
at the margins where it is practical and safe.

It is relatively tiny: minified and compressed, Janus comes in a little under the
size of jQuery. Part of this is because it is not a complete, monolithic stack:
we do not ship a web server solution, a router, or a DOM manipulation library.

Instead, Janus focuses on the central data flow and binding problems at the heart
of your web interface.

Component Walkthrough
=====================

To help you understand what Janus contains and how it works, we will spend a
moment overviewing the framework. There is no secret massive internal machinery
that makes all of these things tick. Everything that exists is described below,
and every component described below is independently useful and directly usable.

Core Abstractions
-----------------

At the heart of Janus are three abstractions: `Varying`, `from`, and `case`. If
you just want to dive in, it isn't too important to understand deeply what they
do; once you see them used in context a couple of times they will make sense. In
fact, you might never realize that you are using `case`s.

For the interested, `Varying` is the most important: it represents a single value
that can change over time, and gives you tools to reason about that value no matter
those changes. `case` is a case-classing microframework, mostly used to make Janus
extensible to your needs. `from` is a chaining API for point-free programming,
allowing you to express computations without directly referencing the resources
those computations require.

Collections
-----------

Janus provides two primary collection types: `Map` and `List`. The reason we ship
our own is because they build on top of `Varying` to provide collections that
adapt to data changes over time.

You can, for instance, get a `value` for a `key` from a `Map` like usual, but
you can get it backed by a `Varying` so that when you do something like print it
on a webpage, the on-screen text updates by itself when that `Map` data changes.

Or, you can start with a `List` `xs` and create a `ys = xs.map(x => x * 2)` which
gives you a new `List` with all the values in `xs` multiplied by two&mdash;forever.
If you update `xs`, `ys` updates automatically.

Models
------

`Model` is built on top of `Map`: a model is just a key/value store with the
addition of domain-specific business logic: attributes of particular types or
with default values, or values that are automatically computed from other values.

Behavior like asynchronous data requests, serialization and deserialization, and
validation rules are all provided out of the box but are easy to enhance, override,
or ignore entirely.

Views and Templating
--------------------

Janus Views map data directly onto the DOM, using CSS selectors and simple binding
methods like `.classed(…)` and `.text(…)`. Actions are bound using
a simple `.on('event', …)` with a callback, which can then directly manipulate
model data to perform some action.

Almost all view problems in Janus can be solved with data transformation using the
collections library, or by inserting a View-Model between the actual data Model
and the View, which we provide a shortcut for.

In fact, by weight the View library is less than 10% of Janus.

Application Classes
-------------------

The three Application classes that ship with Janus help glue the disparate components
into a complete application: `Library` organizes your various components so the
framework knows, for example, which Views to use with which Models, in a way that
allows different contexts between server- and client-side rendering.

`App` sequesters almost all the automagic in Janus, housing context like the main
Libraries and ensuring that context is distributed everywhere it needs to be.

`Manifest` helps encapsulate the page rendering lifecycle, tracking asynchronous
requests and model validity to flag when a page render is fully complete and whether
it was successful.

Real-life Deployment
====================

Because Janus is not a complete monolithic solution, there are a few things you'll
want to include in most projects. We'll talk about them here, but take a look at
the [getting started](/intro/getting-started) guide for a step-by-step with code.

We do not ship a bundled DOM manipulation library, but we do depend on one. We
currently assume a jQuery-like API for this library, and currently test against
jQuery and Zepto.

If you are rendering server-side, you will need a DOM emulator like
[domino](https://github.com/fgnass/domino). A heavier library like
[JSDOM](https://github.com/jsdom/jsdom) will work too, but isn't necessary. We
are considering [cheerio](https://cheerio.js.org/) support as well.

Most projects can depend on the Janus [standard library](/api/stdlib), which
provides useful barebones Views for things like generic Lists, Boolean and Text
edit controls, and more.

Further Reading
===============

Now that you have some broad idea of the pieces, it's time to delve a little
deeper.

* If you are ansty to get coding, check out the [getting started](/intro/getting-started)
  section followed by the [practical guide](/hands-on).
* If you want to understand it all a little better before getting any further,
  start with the [first principles](/theory) section, which starts with motivations
  and slowly rebuilds this whole picture a piece at a time.

