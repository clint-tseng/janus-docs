A Theoretical Conclusion
========================

You've just read a short novel's worth of content in the form of a piece-by-piece
overview of each component of Janus. We've tried to build a narrative flow and
keep things moving, but you're probably still feeling like it was both a whirlwind
tour without quite enough exercise to feel comfortable, but also a deluge of
interconnected concepts and ideas.

This is, therefore, a good moment for a couple of reminders.

* The goal behind this theoretical overview of the framework is to expose its
  individual atomic elements and showcase their independent use, so that you feel
  able to assemble them as best suits your own problems.
  * We don't want Janus to feel like an intricate series of delicate incantations.
  * In this sense, the goal behind what you read is not necessarily to instill
    a perfect understanding of the internal mechanics or the practical usage of
    the framework, but rather to prime you for these more flexible approaches.
* Janus is, with comments and whitespace, a grand total of 3500 lines at time of
  writing.
  * A substantial number of these lines pertain to the implementations of the
    various derived Lists: `.concat`, `.flatten`, `.uniq`, and so on.
  * Very few of the components in Janus are longer than 100 lines. Varying, Map,
    and List are the notable exceptions, and only because they offer so many
    options.
  * When in doubt, it is not at all insane to check the source code itself.
* If you did not start there, the [practical guide](/hands-on) is a great way
  to get a lot of hands-on time with the framework and its components.
  * It does not concern itself with the handwringing, the asterisks, and the
    lengthy descriptions of internal plumbing that this theoretical series did.

That said, here is a short overview of what you have hopefully picked up here:

* A Varying contains a value that can change over time. Mapping operations on a
  Varying result in another Varying whose value is always the mapped value of the
  original, even as it changes.
* Case classes are useful for adding a layer of meaning within a Varying: a Varying
  containing the result of a network request could be anything, but if it is wrapped
  in a `success` case class everybody now knows something about the value.
  * They are also useful for providing extensibility within Janus core components.
* A from expression allows computations and their inputs to be declared vaguely,
  with flexible descriptions which are given context and made concrete when the
  computation is actually needed. At this point, they yield Varyings.
* Mutators are functions with a standard higher-order signature that eventually
  result in stoppable reaction Observations. Templates group mutators together.
  Views oversee the broader lifecycle of a DOM fragment and a bundle of mutators,
  tying them together with some particular subject for context.
* Lists and Maps are standard versions of those data structures, but with methods
  like `.get` and `.length` that return Varying computed values rather than static
  answers, and transformations like `.map` and `.filter` which are maintained forever
  instead of computed once.
  * List and Map are both Enumerable, meaning you can retrieve a List of their
    keys. This enumerability enables Traversal, which is a powerful way to process
    complex trees of data involving Lists or Maps or both.
* Models are Maps with databinding and optional attribute behavior overlaid. Default
  values, serialization, and type-specific behaviors (like available values for
  Enum types) are available by default, and you can always create your own.
  * Model databinding turn Models into powerful problem-solving spaces.
* Requests can be anything that describe some remote data resource, and Resolvers
  are functions that take a Request and return a `Varying[types.result[x]]`. A
  number of useful higher-order Resolvers are bundled with Janus, and it is easy
  to augment them or ignore them entirely.
  * Reference Model attributes can point at remote data with Requests, and will
    automatically resolve the Request and populate the data on the Model when the
    data is needed.
* App is the one thing in Janus that glues the many pieces together with a single
  piece of context. We sequester as much of the framework's magic in it as we can.
  * Something must serve as this context, since views need to know how to render
    their subviews, and Requests need to be matched to Resolvers. Libraries help
    track all of these associations.
  * Manifest is a tool based on this unique power of App that helps you manage
    render lifecycles.
* Resource management is automatic in most of mainline Janus usage, but tools like
  `Varying.refCount`, `Varying.managed`, and `Base.managed` exist when you need
  them.

Again, if you haven't read it already the [practical guide](/hands-on) is a great
way to get more exposure to all of these concepts in practice.

And if you still have questions, there are several [community resources](/community)
available.

Either way: good luck, and we're excited to see what you make with all of this.

