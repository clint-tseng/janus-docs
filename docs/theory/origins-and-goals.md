Origins
=======

Janus originally arose in 2013 out of two desires.

1. To possess a framework that could, with a substantially shared codebase, render
   a web interface on both server and client. This was not something the primary
   options at the time could accomplish, but is important to those of us working
   within accessibility requirements, or SEO constraints.
2. The second was to wield a system wherein complex user interactions could be
   expressed in some safe, organized manner which could be easily unit tested.

One might recall that at that time, rich frontend applications were typically
templated by some backend server like Rails, then some layer of Javascript would
attempt to poke and prod at that generated markup to provide frontend interactivity.
Backbone had just caught on, and the following generation of ideas in frameworks
like Angular were just coming onto the scene.

That era was then followed by several years in which the prevailing methodology
was to eschew the backend entirely and directly render _everything_ on the client.

Neither of these situations were favorable for our goals. And so we created, and
continued to develop, our own solution. Early on, functional or reactive programming
philosophies were not a key component&mdash;you'll see that they're not mentioned
in the above desires. But based on the desires we did have, some things were clear
from the beginning.

To be able to pick up a server-rendered page and resume maintaining it from the
client side, page mutations should ideally be idempotent. This, in turn, implies
some sort of binding system to source data, to actually kick off atomic mutations
when they must occur.

In turn, to be able to bind our idempotent page mutations to source data implies
some kind of model system which can express when data changes, through some kind
of eventing system. Often, what needs to be displayed is some kind of transformation
on the source data&mdash;a string munge or some logics must often be done&mdash;so
this eventing system needs to provide the ability to somehow express and perform
those computations.

You can go back and [look at Janus 0.1](https://github.com/clint-tseng/janus/tree/0.1)
and see how it is a very direct translation of these central ideas into code, in
a rough, object-oriented style reflective of the times. While those central ideas
(and the grammatical form of the APIs) have not changed since then, we have slowly
evolved the framework, listening to what it naturally wanted to be.

It turned out that the framework wanted to be heavily functional. Most of the
headaches we ran into were due to the messiness of composition in object-oriented
programming. And so we formulated a new set of goals, which we will briefly cover.

Goals
=====

Janus today is built on three higher-level goals:

* Present purely functional programming in a friendly, pragmatic manner.
  * We do not shy away from impurity where it does not tend to pose problems.
  * We work hard to present interfaces, syntax, and patterns familiar to the
    average Javascript engineer.
* Embrace the functional ideal.
  * The core workings of the framework reflect various aspects of functional
    philosophy: purity, laziness, composability, point-free expression, and
    time-independence.
  * But we do not always follow conventional wisdom in the realization of these
    ideals.
* Provide defaults that automagically work for most cases, but always allow
  augmentation, variation, or wholesale replacement of those defaults.
  * Every default behavior in the framework is extensible and replaceable.
  * Each building block of the framework focuses on its mathematical essence.

We see these principles as our primary unique offering to the world: we occupy
a novel spot in the continuum of philosophy, one from which we try to further
the functional programming cause by organizing its foundational ideas into concrete
tools whose construction and syntax is familiar and navigable to the general
audience.

And of course, we want to build some applications while we're at it.

Next Up
=======

That was perhaps all a bit abstract. How do all these things look in practice?
In the [next article](/theory/rederiving-janus), we will start with the ideas laid
out here, try to build an interface-rendering tool, and see what that looks like.

