Requests, Resolvers, and References
===================================

**Requests** describe remote resources, which **Resolvers** know how to go and fetch.
In keeping with the type-oriented approach to matching needs with solutions (recall
how `.render` uses the type-driven `app.views` Library to automatically find an
appropriate view for any object), Resolvers are registered against Requests they
know how to handle&mdash;fancy this, via a Library on the `app`.

Relatedly, **References** are a Model `attribute` type which tie their data value
to some `Request`. If the data value is missing and some part of the application
(say, a View template binding) needs it, that Request can be used to automatically
populate the data.

We'll start by examining Requests and Resolvers as their own ecosystem and how
caching is handled through Resolvers. Then, we will add References to the picture
and see how the spider-web of plumbing needed to seamlessly handle Request resolution
is mostly contained within `App`. This will be a great warm-up, since we are going
to focus on `App` next.

First, we'll take a look at `Request`.

Request
=======

Here is the implementation of `Request`, in its entirety, as copied out of the
(Coffeescript) Janus codebase:

~~~ noexec
class Request
  constructor: (@options) ->

  type: types.operation.read()
  signature: undefined # caching signature.
  cacheable: true # for mutation requests, can opt not to save the result.
  expires: undefined
~~~

That's all of it. It doesn't _do_ anything. The constructor takes&hellip; _anything_,
and does nothing with it other than save it off. There is a `type` designation,
which references some case classing type called `operation`, which we can take
a look at, and three additional properties that all appear related to caching.

And that's the first great secret: there is absolutely nothing special about
Request. It's just a hollow classtype into which to cram your own meaning. There
are conventions around caching, yes, but they are easy to self-implement and,
as we will cover, only apply if you want to use the built-in caching solution.
You don't have to.

So, since that wasn't especially enlightening, let's look at Resolver.

Resolver
========

Resolvers are plain pure functions. Here is their signature:

~~~ noexec
(request) => Varying[types.result[x]] | null
~~~

If a resolver is incapable of handling some Request it's given for any reason,
it can return `null` (or `undefined`) to disclaim any responsibility for it. If
it _is_ capable of providing the correct data for that Request, it should return
a `Varying[types.result[x]]`. We covered the rationale behind this result type
[back when we introduced Case Classes](/theory/case-classes#a-practical-example),
and we won't belabor the point again here.

Typically, since Requests are used to tie in data not already at hand, a Resolver
will immediately return a `new Varying(types.result.pending())` while kicking
off some asynchronous process that will eventually change the Varying value to
`success(data)` or `failure(error)`.

Let's take a look at a concrete example, from this very project you are reading,
copied verbatim [from source](https://github.com/clint-tseng/janus-docs/blob/master/src/model/app.js):

~~~
const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) {
    super();
    this.path = path;
  }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

const result = articleResolver(new ArticleRequest('/theory'));
return [
  inspect(result),
  result.map(x => inspect.panel(x.successOrElse('loading')))
];
~~~

Here we already see a deviation from what the vanilla `Request` purports to want:
our Article requests are fully defined just by the path they represent. So rather
than faff about with an `.options` hash, we just ignore it entirely and define a
constructor that takes an Article `path` and saves it off. Requests are always
created by application code, never the framework, so changing the constructor
isn't a big deal. Later, in the Resolver itself, we directly references `request.path`
to figure out what URL we ought to be fetching.

That Resolver just does some really standard AJAX-type things, leaning on jQuery
to do most of the work. It does some munging to make the site's root path work,
before sending the network request off. If the request succeeds, it does the work
of turning the raw response data into a useful object (in this case, with `Article.deserialize`)
and sets a `success` type.

Because we only have one Request type in this documentation project, and our Resolver
can always handle it, it unconditionally returns a Varying.

But what does it even mean to _not_ return a Varying&mdash;how does that return
value impact the rest of the request handling down the chain? To answer these
questions, we'll have to look beyond these simple building blocks (really, all
there is to Request and Resolver are "a thing that describes what I want" and
"a function that takes that description and gives a `Varying[types.result[x]]`)
and look towards bigger questions like applications and caching.

Higher-order Resolvers
----------------------

The great thing about functions is that they are contracts with an extraordinary
amount of wiggle room. These things go in and those things come out, and anything
that happens before or after or in between is somebody else's problem.

We take advantage of this all over in Janus (recall how mutators work, and how
their call signatures merge with `template`), and here with Resolvers we answer
almost every open question by using higher-order functions:

* What if we have different types of requests that need to be resolved in
  different ways?
* Somebody mentioned something about App and Library earlier; how do those enter
  the picture?
* How do we do caching? Caching seems important.

In all of these cases, we rig up higher-order functions to take in some setup
context, in some cases we define some additional conventions (like returning `null`
or those caching-related Request properties you saw earlier), and ultimately
return a function that conforms to the Resolver signature: taking in a Request
and returning a `Varying[types.result[x]]`.

In fact, let's take a look at how we use that `null` return value to answer the
first question in that list, again by looking directly at the (again, Coffeescript)
source code itself:

~~~ noexec
oneOf: (resolvers...) -> (request) ->
  for resolver in resolvers
    result = resolver(request)
    return result if result?
  null
~~~

The `Resolver.oneOf` Resolver takes in many resolvers, and tries each one in turn
until it finds one that returns a non-null result, in which case the Request has
been handled. If it can't find one, it returns `null` itself. Notice how once we
have fed it our resolvers, it presents the standard function signature of a Resolver:
take in a Request, return a `Varying[types.result[x]]` if it can.

Let's look at another example from the source code, and answer the second question
on the list: how do App and Library figure into this picture?

~~~ noexec
fromLibrary: (library) -> (request) -> library.get(request)?(request)
~~~

This one is even simpler. You do have to understand that `library.get` is the
other end of `library.register`: when `.get` is called, the Library will search
through all its registrations (in this case, "this Resolver handles this Request")
to find one that matches, and return that object.

> You also might need to understand that the `?` inserted awkwardly into the middle
> is a Coffeescript trick that smooths over the case where `library.get(…)` returns
> `null`. What exactly it does is not important.

But otherwise, this is quite straightforward. We set ourselves up with a Library,
then for each Request we get we search the library for a registration that claims
to handle that Request, and if we find one we call that registered Resolver with
our Request.

But wait, why do both `Resolver.oneOf` and `Resolver.fromLibrary` exist? They both
seem to solve the same problem: given a Request and many possible Resolvers, try
to locate a Resolver that might handle that Request and have it do so.

It turns out that `fromLibrary` is configured by default and `oneOf` is not&mdash;this
preference can be found in an overridable method in `App`. As Library registrations
are far more precise than "try everything until something sticks," it is the
solution we prefer.

Rather, to understand why `oneOf` exists, we need to get into caching.

Caching Resolvers
-----------------

Given how loose and generic Request and Resolver have been (and will remain), one
might wonder why Janus bothers to offer a canonical solution to this problem at
all. The first answer you will find in the next section, as there is a careful
thread woven through several Janus components to make `Reference` Model attributes
work seamlessly. The second answer is caching, which we discuss here. Both of
these problem areas would be annoying to have to solve purely in application code,
and both are essential aspects without which the framework would not feel complete.

Why is caching _that_ important? We'll get more into in the following section,
but the on-demand nature of how References are reified (and thus Requests are made
and Resolvers tasked with handling them) and the extremely decentralized nature
of Janus together mean that it is not uncommon for more than one corner of your
application to request the same data, independently and in parallel.

This would be a critical and fundamental flaw in our approach were we not to offer
some kind of canonical answer, and our answer is a caching layer that understands
when it has already seen some Request already, and provide a cached value _even
if the previous Request has not completed_. This is important if we are to actually
address the redundant-request issue we just described.

As with the other higher-order Resolvers, we'll take a quick glance at the actual
implementation code of `Resolver.caching`, which incorporates a conventional Janus
cacher into an actual Resolver process:

~~~ noexec
caching: (cache, resolver) -> (request) ->
  if (hit = cache.resolve(request))?
    hit
  else
    result = resolver(request)
    cache.cache(request, result) if result?
    result
~~~

To start with, `Resolver.caching()` takes two context parameters: an actual `cache`
instance to use, as well as a real `resolver` function which is actually capable
of resolving Requests. We can see that the `cache` is expected to implement two
methods. The first is `.resolve(request)`, which returns `Varying[types.result] | null`
just like a normal Resolver. And just like a normal Resolver, if `null` is returned
this process assumes that the cache could not handle the Request and moves on to
the actual Resolver.

And in this case of a cache miss, the cache is then offered the result of the actual
Resolver's resolution (should it exist) via the `.cache(request, result)` method.
This gives it the chance to learn the result so that it might offer it the next
time it sees the same Request.

But how does it know whether it's seeing the same Request again? It could operate
by instance reference equality, but this precludes our ability to generate Requests
at will and still take advantage of caching. Instead, the packaged caching solution
relies on those extra methods and properties you saw on Request earlier:

* `.signature()` returns a caching signature for the Request. If it is not
  implemented or it returns `null`ish, the Request is assumed uncacheable. If it
  returns a `signature` that's already been seen, those Requests are assumed
  identical.
* `.type` is a property of type `types.operation`, which contains the cases `read`,
  `create`, `update`, and `delete`. Each of the operations has assumed semantics
  by REST convention: `read` Requests are directly cacheable, all other Requests
  clear or update the cache in various ways.
* `.expires` is a property that indicates, in number of seconds, how long the
  result should be cached for.

Again: all of these are _just conventions_, ones that are followed by the bundled
solution Janus offers, and which can be ignored at will. We will expand on this
in a moment, but it was important to emphasize it again in the meantime: these
are not handcuffs to be bound by.

In fact, there is only one actual cache implementation bundled with Janus: the
`MemoryCacheResolver`. It simply checks for signatured requests and when it sees
a match it returns whatever Varying instance was last offered up for that signature.
It also does some work to make use of the `.type` and `.expires` semantics listed
above, but for now let's just see a basic example of a whole Resolver system wired
up, with a cache and Library and everything.

> We will not cover every aspect of the Memory Cache Resolver here. In particular,
> we won't discuss its various behaviours given different Request types. For more
> information on that, please check the [API Reference](/api/TODO).

We'll once again use Article as our basis, as we did above.

~~~
// this is all the same:
const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

// but this is different:
const resolvers = new Library();
resolvers.register(ArticleRequest, articleResolver);

const resolver = Resolver.caching(
  new Resolver.MemoryCache(), Resolver.fromLibrary(resolvers));

const x = resolver(new ArticleRequest('/theory'));
const y = resolver(new ArticleRequest('/theory'));
const z = resolver(new ArticleRequest('/theory/requests-resolvers-references'));

return [
  x, y, z,
  x === y,
  y === z
].map(inspect);
~~~

Now that `.signature` method makes more sense: we expect our article content to
remain the same for any given path, so we simply use that as our caching signature.
And you can see that when we use the memory cache, the resolved requests don't
just contain the same value, they resolve to the same Varying instance.

It doesn't always make sense for caching layers to go through `Resolver.caching`.
One idiom, for instance, is for any data involved with the server-side rendering
of a page to be serialized onto the page itself, so that separate network requests
doesn't need to be remade for that data. (It also helps ensure state constancy
if you are using View `.attach`.)

In these cases, the cache never needs to be updated; these caches are initialized
with all the data they will ever understand, and will never learn the results of
additional Requests. We provide one simple implementation in the form of `Resolver.fromDom`.
Here, finally, is where `Resolver.oneOf` becomes useful:

~~~ noexec
const library = new Library();
const resolver = Resolver.caching(new Resolver.MemoryCache(),
  Resolver.oneOf(Resolver.fromDom($('#cache')), Resolver.fromLibrary(library)));
~~~

(We don't provide a full working sample here as demonstrating all three layers
of this assembled system working would take a lot of wrangling, but) you can see
that we still initialize a full Memory Cache as appropriate, but instead of immediately
delegating to `Resolver.fromLibrary` should the cache fail, we first try our DOM-based
cache with `Resolver.fromDom`.  In this way, we can layer together many different
resolution strategies into a coherent system.

But as promised, you can ignore `MemoryCacheResolver` and write your own, or ignore
the entire set of default conventions entirely and create your own. In fact, our
Article scenario is a great example: all `.signature` does is return `path`, the
_only_ data value on the entire Request, and this documentation application only
ever makes read requests. We can save ourselves some boilerplate and overhead if
we roll our own:

~~~
// this time this is different:
const Article = Model.build(attribute('samples', attribute.List));
class ArticleRequest { constructor(path) { this.path = path; } }

const articleCache = {};
const resolver = (request) => {
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;

  if (articleCache[path] == null) {
    const result = articleCache[path] = new Varying(types.result.pending());
    $.getJSON(path)
      .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
      .fail((error) => { result.set(types.result.failure(error)) });
  }
  return articleCache[path];
};

// but this is the same:
const x = resolver(new ArticleRequest('/theory'));
const y = resolver(new ArticleRequest('/theory'));
const z = resolver(new ArticleRequest('/theory/requests-resolvers-references'));

return [
  x, y, z,
  x === y,
  y === z
].map(inspect);
~~~

We have such a limited problem space here that we save ourselves a lot of work
by limiting our solution capability. Our system will never be able to effectively
handle anything more complex than requests to Articles by `path`, but in return
we save ourselves the overhead of understanding and implementing `signature` and
`type` and `MemoryCache` and `Resolver.caching`.

All that really matters is that Resolvers return a `Varying[types.result[x]]`.
So long as this is true, they will plug into the rest of the Janus machine perfectly.

But in a real application, you won't typically be creating and calling Resolvers
directly like this. For one, a lot of your Requests will be resolved automatically
and implicitly through Reference Attributes, which we will cover in the following
section. But as well, even for manual Requests (for instance, for write or delete
Requests) much like we've had App managing our Views in all our samples so far,
we usually have App manage our Resolvers as well.

~~~
// this is all the same:
const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

// but this is different:
const app = new App();
app.resolvers.register(ArticleRequest, articleResolver);

const result = app.resolve(new ArticleRequest('/theory/requests-resolvers-references'));
return inspect(result);
~~~

For now, the main difference is that we are using the Resolver library built in
to App, and calling `app.resolve(request)` instead of directly invoking our assembled
Resolver. We have temporarily lost our caching stack, but we will bring that back
in the [next Chapter](/theory/app-and-applications), which covers App in detail.

The important information for now is that `app.resolve` exists to handle Request
resolution just as `app.view` exists to handle View instantiation, and that although
we are going to spend the rest of this article discussing automatic Request resolution
through the Reference Attribute, you can always use `app.resolve(request)` to
manually resolve any Request.

The Reference Attribute
=======================

The goal of References, as we've now stated many times, is to seamlessly integrate
networked, nonpresent data into Models alongside normal data. Often, these references
will even depend on concrete Model data. Let's see an example of this working in
the context of Article.

~~~
// this is all the same:
const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

// but this is different:
const Site = Model.build(
  attribute('article', class extends attribute.Reference {
    request() { return from('path').map(path => new ArticleRequest(path)); }
  }));

const ifValue = (f => x => (x == null) ? null : f(x)); // a little helper.
const SiteView = DomView.build(
  $('<div><div class="path"/><div class="sample-count"/><button>Home</button></div>'),
  template(
    find('.path').text(from('path')),
    find('.sample-count').text(from('article').watch('samples').flatMap(
      ifValue(samples => samples.watchLength().map(count => `${count} samples`)))),

    find('button').on('click', (_, subject) => { subject.set('path', '/'); })));

const app = new App();
app.resolvers.register(ArticleRequest, articleResolver);
app.views.register(Site, SiteView);

const site = new Site({ path: '/theory/requests-resolvers-references' });
return app.view(site);
~~~

As with the last sample you saw, here we use the `.resolvers` Library built into
App to register our `articleResolver` against. But we never directly call `app.resolve`;
that happens as a part of resolving the Reference.

The first key here is the `Site` Model definition, which declares an `article`
attribute (remember, `attribute`s indicate "here is some special behaviour to go
along with the data that lives at the `article` key on this Model") of type `Reference`,
whose only definition is a method `request`. That method returns a `from` expression
which reads up the `path` value on Site, and maps it to an `ArticleRequest` for
that path.

> You can use the shortcut `attribute.Reference.to(from(…))` if you tire of
> declaring anonymous classes.

You don't have to use `from` expressions here; you can return a `Request` directly
when the `request` method is called if you'd prefer, or even a `Varying[Request]`.
But `from` expressions are a convenient way to express a Request as a consequence
of other data values on a Model without needing to do any side-effect or resource
management on your own: imagine, for instance, writing an expression that binds
properties like `q`, `category`, `page`, and `limit` into a Request for some catalog
of Things.

The second key here is the simple fact that in our View, we have a `from` binding
that delves into `article`, to get at the `samples` List within it. It doesn't
know that `article` is anything besides another data property (though of course
you probably should).

This implicit statement ("I care about this value"), combined with the Reference
attribute, together cause the Request to be formulated and resolved. Once the data
comes in, the new `Article` Model is saved onto Site at the `article` key. You
can verify this by removing the `find('.sample-count').text(…)` block from the
`SiteView` above, and firing up your Network Inspector pane on your browser. With
that `from` binding, every time you tweak the code sample a new network request
will be issued. Without, nothing.

> Because Reference attributes typically point at somewhat more auxiliary data
> not intrinsic to the Model itself, they are by default marked as `transient`,
> which means the populated data value will _not_ be included in any serialization
> of the Model. You can override this on the `attribute` you declare.

There is another way to say that you care about some value, in case you do need
a Reference to resolve but for whatever reason `from` doesn't fit the bill:

~~~
// this is still the same:
const Article = Model.build(attribute('samples', attribute.List));

class ArticleRequest extends Request {
  constructor(path) { super(); this.path = path; }
  signature() { return this.path; }
}

const articleResolver = (request) => {
  const result = new Varying(types.result.pending());
  const path = (request.path === '/') ? '/index.json' : `${request.path}.json`;
  $.getJSON(path)
    .done((data) => { result.set(types.result.success(Article.deserialize(data))) })
    .fail((error) => { result.set(types.result.failure(error)) });
  return result;
};

const Site = Model.build(
  attribute('article', class extends attribute.Reference {
    request() { return from('path').map(path => new ArticleRequest(path)); }
  }));

// but this is different:
const SiteView = DomView.withOptions({ resolve: [ 'article' ] }).build(
  $('<div><div class="path"/><div class="sample-count"/><button>Check</button></div>'),
  template(
    find('.path').text(from('path')),
    find('button').on('click', (event, subject, view, dom) => {
      const article = subject.get('article');
      if (article == null) return;
      dom.find('.sample-count').text(article.get('samples').length + ' samples');
    })));

const app = new App();
app.resolvers.register(ArticleRequest, articleResolver);
app.views.register(Site, SiteView);

const site = new Site({ path: '/theory/requests-resolvers-references' });
return app.view(site);
~~~

What we are trying to show here is the `DomView.withOptions` option of `resolve`,
which indicates some set of Model keys you wish to resolve.

But as you can see, we had to go to some rather evil lengths to concoct a sample
here: you'll learn in the following section and chapter that even if you avoid
the typical `from` templating syntax and write `this.subject.watch('article')`,
the Reference will still end up getting automatically resolved. (The `.watch` is
the key.)

Either way, the bottom line is that given the two keys we mentioned above: a
Reference attribute that defines some Request whose resulting data should reside
at that attribute's location on the Model, and an indication that this data value
is somehow important to your application, Janus will skitter off and resolve that
Request for you, dropping the result onto the Model.

We'll get into how exactly App, View, and Model work together to make all of this
happen in the following chapter, which will focus on the various magicks that App
performs. For now, we will focus on just the Reference attribute and try to explain
a little bit more about how it works.

Reference Internals
-------------------

The Reference attribute is like any other in that it's entirely passive: it just
sits there. Default values, serialization behavior, etc&mdash;all of these attribute
behaviors only work because something else in Janus or in your application knows
to look for it. The same is true of Reference requests and resolution.

Where Reference is a little special is that it will actively manipulate the data
on the Model when it needs to&mdash;no other bundled attribute does this. We've
already seen the `.request` method implemented above; another method provided by
Reference is `.resolveWith`, which takes an `app` and does a laundry list of tasks:

* Prevents any future calls to `.resolveWith`.
  * Subsequent calls do nothing and return nothing.
* Calls `.request()` on itself and does any homework needed to arrive at a `Request`
  or `Varying[Request]` object.
* Sets up a reaction to check whether anybody is actually `.watch`ing its key on
  the Model (so in the example above, if anybody has actually `.react`ed on
  `site.watch('article')`.
  * If somebody is, asks `app` to resolve the Request into `Varying[types.result]`.
    * If that resulting Varying ever carries a `types.result.success` value, sets
      that value onto the Model at the appropriate key. You may recall this [from
      our introduction to case classes](/theory/case-classes#a-practical-example).
  * If nobody is, halts the above Varying reaction if it exists.

So Reference can only be given an `app` context once, since `.resolveWith(app)`
may only be called once. But calling `.resolveWith` doesn't actually cause any
Requests to be resolved; rather, it just gives context (`app`) on how resolution
should occur.

Once Reference has that `app` context, however, it wakes up. If it senses, by
way of an observation on its Model key, that somebody cares about the data it could
provide, it will kick off that Request and write any successes it sees into the
Model. If eventually nobody cares anymore, it terminates the Request by stopping
its own observation on the result, and goes back to waiting for somebody to care.

> Notice how it writes "any successes it sees" into the Model. If you have some
> sort of procedure whereby a remote resource might change, and that change might
> push down the pipe to your Janus application, all you have to do is
> `varying.set(types.result.success("new result"))` again and that new value will
> be written into the Model.

Notice that this dependence on `.watch` observation means a `.get('article')` call
will _not_ trigger any Request resolution. Beacuse `.get` returns synchronously
a static value, we can't give back a Varying pointing at some future value, and
we have no idea given a single `.get` whether that value will be checked again,
so we don't know if anybody actually cares. Ergo, Reference does nothing in this
case.

In this way, we set up a remote resource system that operates like the rest of
Janus: it is declarative, it is resilient to changes over time, and it is lazy&mdash;it
will not do the work unless it must.

But where does `.resolveWith` get called from, and why have all our examples so
far involved an observation from a View? What happens if we want a Reference attribute
to resolve from some other context? These questions, and more, are the reason `App`
exists, and we will explore them and several others in the next chapter.

Recap
=====

We explored Requests, Resolvers, and References in somewhat of a strange way. With
Requests and Resolvers, we mostly looked at the implementation code itself, and
discussed examples in very elementary, concrete terms.

When we jumped to References, we showed some basic usage examples, and talked
through a flowchart of the general process, but otherwise we suddenly got quite
vague. A lot of this is because a full picture doesn't emerge until you understand
more about App, which we will cover in our next chapter.

In the meantime, here's what we learned:

* Requests describe some sort of remote resource in such a way that a Resolver
  will know how to fetch that resource. You get to decide what this means.
  * It has a default implementation and some default properties, but really a
    Request can be anything you'd like&mdash;you don't even have to subclass
    `Request` itself. (Janus's own unit tests don't.)
  * The properties that do exist largely describe caching-relevant information.
* Resolvers are functions that take Requests and return `Varying[types.result[x]] | null`.
  * Typically, this is done by initializing a return value of `new Varying(types.result.pending())`,
    starting some asynchronous process, and repopulating the Varying with some
    other `types.result` value once the process completes.
  * Higher-order functions can be used to construct somewhat more complicated
    Resolver processes, like `Resolver.oneOf` and `Resolver.fromLibrary`.
  * Janus defines a standard interface for caching (the `.resolve` and `.cache`
    methods) and bundles a `MemoryCacheResolver`. But these can be ignored entirely
    if they are not to your liking.
  * App has a `.resolvers` library built into it, as well as a method `app.resolve(request)`
    which handles Request resolution. You'll learn more about this in the next
    chapter.
* References are attributes that point at some remote data resource.
  * Once they get the context (`app`) needed to actually fulfill the Request they
    carry, and they sense that there is an observer that cares about the value,
    they will kick off the Request resolution process.
  * Any success surfaced in that resulting Varying will be written directly onto
    the Model as a data value.
  * By default, Reference attributes are marked as `transient`, so the data they
    reference will not serialize with the Model. This may be overridden in your
    `attribute` class definition if you so choose.

Next Up
=======

It's the home stretch. We only have two more topics to cover. The next chapter,
as we have mentioned, will deal with `App` and explain how they form the contextual
backbone of your application in the extremely decentralized world of Janus, especially
when it comes to View and Resolver context.

We will also take a deeper look at the Library facility we have been using this
entire time, and introduce Manifest, which ties together many of the concepts you
have been learning about to help you manage server-side rendering lifecycles.

If you're feeling iffy about our description so far of how exactly References and
Apps and Views and Models glue together, it'll probably be more productive to move
on to the next chapter and come back to this one once you have a little more context.

In either case, grab one last coffee and hop on over to our [penultimate chapter](/theory/app-and-applications)
in this theory-oriented overview of Janus.

