Resource Management
===================

You've seen so far some hints of resource management in Janus: the laziness of
mapped Varyings, for instance, ensures that unobserved and therefore useless
computations are not performed. You've also seen us hint a few times that Janus
has alternatives to common methods like `.on` which are meant to ensure proper
resource disposal.

And broadly speaking, you're going to find sort of the same split philosophy in
resource management as you find in the framework at large: when we do things
through Varying, we create resources and perform work when the Varying is observed,
and put everything away when it is not&mdash;but when it comes to instantiated
data structures like List, Map, and Model, observation is a harder concept to
define and track, and so we have a different strategy.

You should not find yourself frequently needing the information in this chapter,
especially if you rely primarily on `from`, `bind`, and the other declarative
interfaces. But if you start building performance intensive applications and the
corresponding custom pipelines needed to support these, you'll find that these
tools are not too difficult to put to use.

We will start by discussing Varying-based resource management.

Managing Varyings
=================

We've previously discussed that Mapped Varyings are inert, they don't perform their
mapping computation even if their source value changes unless someone is actually
paying attention. In the case of Mapped Varyings this tracking is all internal,
but all Varyings provide a mechanism, `.refCount`, that you can use to create
similar behavior of your own.

Reference attributes actually use this: remember that Reference attributes don't
actually resolve their Request unless they detect that someone actually cares
about their attribute: not just that it has been `.watch`ed, but that the `.watch`
has been `.react`ed upon. Here's a sample mechanism somewhat similar to that one:

~~~
const lazyRequester = (request, resolver) => {
  const result = new Varying(types.result.init());
  result.refCount().react(false, count => {
    if (count > 0) result.set(resolver(request));
  });
  return result.flatten();
};

const sampleResolver = (request) => {
  const result = new Varying(types.result.pending());
  setTimeout((() => { result.set(types.result.success(42)); }), 3000);
  return result;
};

const varying = lazyRequester(new Request, sampleResolver);

const noop = function() {};
const GoButton = DomView.build($('<button>go</button>'),
  find('button').on('click', () => { varying.react(noop); }));

return [
  inspect(varying),
  new GoButton()
];
~~~

Here, in `lazyRequester`, we create a Varying return value with an initial value.
But before we return it, we `.react` to its `.refCount()`, which is a Varying
that always carries the number of observers on the actual valued Varying. We kick
off Request resolution any time we see that there is more than one observer,
though in practice we would only want to resolve the Request once.

We flatten the result so that when we _do_ get a result Varying from Request
resolution, we can blithely dump it inside our actual result, and the two will
flatten out to an actual result value.

> Clicking on the ( ? ) in the result inspector does the same thing as the Go
> button, causing a reaction on the Varying and thus increasing the observer count.

In this way, using `.refCount`, we can create Varyings whose answers require work
of some kind, but postpone that work until we are sure it will actually be useful.

> # Aside
> Here is a spot where we can talk about other FRP systems for a moment. Many of
> them distinguish between ["hot" and "cold" observables](https://alligator.io/rxjs/hot-cold-observables/).
> It's&hellip; all actually rather quite complicated when you first run into it,
> and it actually has to do with where the observable values _originate_ from
> (remember that in conventional FRP, observables represent _streams of values_
> over time).
>
> In practice, what it means is that you have to be a bit careful writing and
> consuming observables in case you, for example, end up making the same network
> request over and over again just by subscribing to the same observable more
> than once. In Janus, there is only one Varying.

This doesn't only apply to asynchronous work like network requests. Expensive
local computations can also be managed in this way, even synchronous ones: the
sequence of events is carefully orchestrated so that `.refCount` will update (and
so any code you write that handles `.refCount` will run), and _then_ the present
value of the Varying will be handed to the `react` callback, so you have a window
to sneak the correct answer in there.

~~~
const results = [];
const v = new Varying(0);
v.refCount().react(count => { if (count > 0) v.set(42); });

v.react(x => { results.push(x); });
return results;
~~~

Of course, expensive Mapped Varying computations are already and automatically
managed by Varying itself. Usually, you'd use this process to, for instance,
instantiate derived data structures (`.flatMap(…).filter(…).uniq().watchLength()`,
anybody?). But this all sounds quite repetitive. Surely there is some way to hand
off all of that homework, and just focus on what matters.

~~~
class ExpensiveClass {
  result() { return Varying.of(42); }
  destroy() {
    // free up resources..
  }
}
class AnotherExpensiveClass extends ExpensiveClass {}

const v = Varying.managed(
  (() => new ExpensiveClass()),
  (() => new AnotherExpensiveClass()),
  (expensive, another) =>
    Varying.mapAll(expensive.result(), another.result(), (x, y) => x + y)
);

const results = [];
// this forces the expensive classes to be created:
const observation = v.react(x => { results.push(x); });
// and this calls destroy() on them:
observation.stop();
return results;
~~~

The `Varying.managed` method takes a bunch of functions that each returns some
kind of expensive resource, and a final function that takes those resources and
returns a Varying with the correct answer. It hangs on to all of these things
until somebody comes along and `get`s or `react`s on it, at which point it calls
all the resource functions, and hands those resources off to your function that
gives the correct Varying result.

When nobody cares again, it frees up those resources.

The `.destroy` method is an important one. It indicates that a resource is no
longer needed, whereupon Janus will do its best to eliminate all references and
encourage the garbage collector to clean the object up. It is implemented on the
class that serves as the base class of most objects in Janus, appropriately named
`Base`.

The Base Class
==============

With the exception of Varying, from, case, Request, and the resolver functions,
pretty much everything in Janus derives from Base. This includes List, Map, and
Model, View and DomView, App and Manifest, and quite a few others.

Base provides three primary facilities:

* Basic event emitting in conformance with the standard `.on`, `.off`, `.emit`
  protocol via `EventEmitter2` (Janus's only dependency).
* Managed event listening `.listenTo` and Varying reaction `.reactTo` methods
  which automatically terminate when the Base object is destroyed.
* `Base.managed`, which works somewhat like `Varying.managed`.

Central to all of these facilities is `.destroy`. Upon destroy, a Base object
will:

* Do some things to do with `Base.managed`, including decide whether or not to
  proceed with destruction (we'll get to this).
* Terminate all inbound event listeners (other objects listening to its events).
* Terminate all outbound event listeners created with `.listenTo` and outbound
  Varying observations created with `.reactTo` (this object listening to other
  things).

The terminations are easy to describe and explain: any time you directly write
`.on` or `.react`, you should strongly consider using `.listenTo` or `.reactTo`
instead. These managed methods flip the call order: you call them on the object
that is doing the consumption, and the first argument is the object being consumed:

~~~
class ErrorLog extends Model.build(
  dēfault.writing('errors', new List())
){
  _initialize() {
    this.listenTo(this.get('app'), 'resolvedRequest', (request, result) => {
      this.reactTo(result, value => {
        if (types.result.failure.match(value)) this.get('errors').add(value);
      });
    });
  }
}

// set up a fake resolver that we can feed a result from the Request itself:
const sampleResolver = (request => new Varying(request.options.result));
class SampleApp extends App {
  resolver() { return sampleResolver; }
}

const app = new SampleApp();
const log = new ErrorLog({ app });

app.resolve(new Request({ result: types.result.failure("No connection.") }));
app.resolve(new Request({ result: types.result.success(42) }));

log.destroy();
app.resolve(new Request({ result: types.result.failure("No response.") }));

return inspect(log.get('errors'));
~~~

You can see that once `log.destroy` is called, the listener and reaction are unbound
and so further events and reactions do not make it to the log.

Of course, this means that you need to ensure that `.destroy` is actually called
on objects that are no longer needed, to actually make use of these managed methods.
In any case where Janus instantiates an object for you (Views and ViewModels, for
instance), it will also take care of `.destroy`ing it. And in many cases, you don't
need to worry about destroying objects instantiated inside pure mapping functions:

~~~ noexec
bind('even_count',
  from('some_list').flatMap(list => list.filter(x => (x % 2) === 0).watchLength()))
~~~

Here, a Filtered List and a Varying are created as part of the mapping pure function.
But we don't have to worry about `.destroy`ing it: because this function is pure,
only Varying internals can ever form references pointing at these objects&mdash;downstream
maps and reactions on the result of this `.flatMap` get a plain length value, with
no access to the filtered list or even the Varying that carries the length. So,
when the Varying is no longer being observed and the Varying internals relinquish
their references to the mapping results, these intermediate objects will automatically
be cleaned up by the garbage collector.

<!-- TODO: is this true? how about the outbound event listeners to the parent list? -->

But when you are working in a more object-oriented fashion, for instance when
implementing a List transformation of your own and instantiating tracking objects,
you'll need to think more carefully about whether these objects need special handling.
In most cases, it'll be easier to spare yourself the mental exercise and just
implement one of these strategies:

~~~ noexec
class CustomList extends List.Derived {
  _initialize() {
    this._trackingList = new List(); // uh oh! an instantiated object.
    this._trackingList.destroyWith(this); // method 1

    // don't use .on, use .listenTo.
    this.listenTo(this._trackingList, 'added', x => { /* … */ });

    // don't use .react, use .reactTo:
    this.reactTo(this._trackingList.watchLength(), l => { /* … */ });
  }

  _destroy() {
    this._trackingList.destroy(); // method 2
  }
}
~~~

This List is probably fine without destruction, especially if `CustomList` is the
only object that has direct access to it. But grey areas can be hard to reason
about, and so the safer thing to do is to ensure its cleanup.  Captive resources
can be scheduled for destruction with their parents with `.destroyWith()`, which
does exactly what it says.

The alternative is to implement a `._destroy()` method, and to do it yourself.
`Base` implements and defines `.destroy()`, which is the method one would actually
call to cause destruction. But `.destroy()` has some work of its own to do&mdash;the
`.listenTo` and `.reactTo` cleanup, for example&mdash;and so overriding `.destroy()`
is tricky business. Instead, `.destroy()` will always seek out and call a method
called `._destroy()` if it exists: that is your space to implement cleanup logic.

> Internally to the framework, components implement `.__destroy()` (that's two
> underscores), and Base `.destroy` will always try to call that, too. So if you
> are digging into framework code and you see `.__destroy()`, this is why: we
> don't want to override `.destroy()` any more than you do, but we don't want to
> pollute `._destroy()` either.

But sometimes you need to optionally generate computed resources for external purposes
only when they're needed&mdash;when someone asks for the enumeration (all keys,
or in this case numeric indices) of a List, for example. You don't usually care,
you don't usually track this information, but there's work to be done if somebody
does.

The basic implementation is straightforward enough:

~~~
class SampleList extends List {
  enumeration() {
    const result = new List((new Array(this.length)).fill().map((_, idx) => idx));
    this.listenTo(this, 'added', () => { result.add(result.length); });
    this.listenTo(this, 'removed', () => { result.removeAt(-1); });
    return result;
  }
}

const list = new List([ 4, 8, 15, 16, 23, 42 ]);
const enumeration = list.enumeration();

list.add(63);
list.remove(15);
list.remove(16);
return enumeration;
~~~

We even used `.listenTo`, so the work will be terminated when our List is destroyed.
But even in this simple example where the generate resource and work is minimal,
there's still something left to be greatly desired&mdash;what happens if many
consumers care about the enumeration? Right now, we're doing all this work for
every single one of them.

We could, of course, simply cache the result the first time we formulate it, and
return the cached List for future calls. But then we don't know when everybody
is done with the thing, and it would be nice to be able to _proactively_ stop
managing the enumeration if we could.

~~~
class SampleList extends List {
  enumeration() {
    if (this.enumeration$ == null)
      this.enumeration$ = Base.managed(() => {
        const list = new List();
        list.listenTo(this, 'added', () => { list.add(result.length); });
        list.listenTo(this, 'removed', () => { list.removeAt(-1); });
        return list;
      });

    return this.enumeration$();
  }
}

const results = [];
const list = new List([ 12 ]);
const enumeration = list.enumeration();
const enumeration2 = list.enumeration();

enumeration.destroy();
list.add(24);
enumeration2.destroy();
list.add(48);

return [
  enumeration === enumeration2,
  enumeration
];
~~~

Here, we use `Base.managed`, which is a lot like `Varying.managed`. Unlike the
Varying mechanism, however, `Base.managed` doesn't manage multiple object instances
that boil down to a Varying, but instead returns a single managed object instance.
We do still have to cache/memoize something on the parent object, which in this
case is the manage facility itself.

> In Janus internals, cached values are always named with a `$` appended after the
> method name that generates and relies on them.

We can see from the final result checks that our two calls to `.enumeration()`
resulted in exactly the same List instance (if you perform this check on the previous
sample, it will not be true). We can also see that after one `enumeration` was
already destroyed the addition of `24` still resulted in an update to the enumeration
List, while the addition of `48` after both requested enumerations were `.destroy`ed
is not reflected.

> You will also notice that we instantiate the result List, and call `list.listenTo`
> rather than `this.listenTo`. After all, it is the result List whose lifespan
> the listener should relate to&mdash;and there is nothing wrong with this sort
> of invocation.

Internally, _all_ Base objects have a reference counter. By default, this counter
is instantiated with a value of `1`, and at some point when `.destroy` is called
the counter is decremented and the destroy procedures are carried out only if the
counter has hit `0`. The method `.tap` increments the counter.

All `Base.managed` does is choose intelligently between instantiating a new resource
by calling your function or calling `.tap` on the one it knows it already has.

Of course, all of this depends on the resource consumer actually calling `.destroy`.
These sorts of risks are always present in modern garbage collected languages.
Janus does its best to minimize these risks internally, and where it cannot it
provides tools like `.managed` for you to use in controlling those resources on
your own.

Recap
=====

Resource management in Janus falls into two primary domains: limiting computation
and ensuring garbage collection. In a lot of cases, and especially with the standard
declarative syntax and pure functions we encourage, these concerns should be
automatically addressed.

Where they cannot, Janus offers some tools to help you.

* `varying.refCount()` returns a `Varying[number]` indicating the number of reactions
  (observers) on `varying`. This can help you postpone work until it matters.
* For an even more automatic approach, `Varying.managed` generates a `Varying`
  which, when observed, generates resources of your description and manages their
  lifecycles for you.
* All Base objects in Janus feature a `.destroy` method. It's often not necessary
  to call it, as long as the garbage collector can tell when you are done with
  an object. But if you're not sure, it's always safer to be explicit.
* Similar to `Varying.managed` is `Base.managed`, which automatically manages the
  lifecycle of a single shared Base resource.

Next Up
=======

You've now surveyed every component of Janus. That is quite a lot of reading.

We have just some [closing thoughts](/theory/conclusion).

