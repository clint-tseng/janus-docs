
Resource Management
===================

/*Once again, this section is not essential reading for the majority of practical
cases. It's rare that you'll have to create one of these on your own. But again,
it is something that will come up when you peruse Janus internals, or if you are
doing fancier things. In the interest of providing a full theoretical foundation,
we'll delve into it here.*/

It feels like we've already talked quite a bit about resource management, especially
if you read the [Underlying Mechanics](#underlying-mechanics) section above. But
what we've discussed so far in this direction pertains just to Varyings themselves.
What happens if providing a value for a Varying involves generating some expensive
resource?

> # Aside
> This is another spot where we should talk about other FRP systems for a moment.
> Many of them distinguish between ["hot" and "cold" observables](https://alligator.io/rxjs/hot-cold-observables/).
> It's&hellip; all actually rather quite complicated when you first run into it,
> and it actually has to do with where the observable values _originate_ from
> (remember that in conventional FRP, observables represent _streams of values_
> over time).
>
> In practice, what it means is that you have to be a bit careful writing and
> consuming observables in case you, for example, end up making the same network
> request over and over again just by subscribing to the same observable more
> than once. In Janus, there is only one Varying.

As always, the goal is to be as lazy as possible. If, say, we need to generate a
Varying whose value relates to a bunch of math on all the terms of a List (which,
because this is Janus, must be continually kept up to date every time one of the
terms change), we still want to be able to return that Varying, but we don't want
to do and continually maintain all that math unless somebody cares.

So, the first question is: how do we tell if somebody cares?

Varying provides a very primitive tool and a somewhat fancier one to help solve
this problem. The primitive one is `Varying.refCount()`:

~~~
const results = [];
const v = new Varying(42);
v.refCount().react((count) => { results.push(count); });

const observable1 = v.react(() => null);
const observable2 = v.react(() => null);
observable1.stop();
observable2.stop();
return results;
~~~

`refCount` is _itself_ a Varying, so you can return your inert Varying but listen
to its `refCount`, and start performing the expensive computation right when it's
actually needed. The sequence of events is carefully orchestrated so that `refCount`
will update (and so any code you write that handles `refCount` will run), and _then_
the present value of the Varying will be handed to the `react` callback, so you
have a window to sneak the correct answer in there:

~~~
const results = [];
const v = new Varying(0);
v.refCount().react((count) => { if (count > 0) v.set(42); });

v.react((x) => { results.push(x); });
return results;
~~~

But this all sounds quite repetitive. Surely there is some way to hand off all
of that homework, and just focus on what matters.

~~~
class ExpensiveClass {
  result() { return 42; }
  destroy() {
    // free up resources..
  }
}
class AnotherExpensiveClass extends ExpensiveClass {}

const v = Varying.managed(
  (() => new ExpensiveClass()),
  (() => new AnotherExpensiveClass()),
  (expensive, anotherExpensive) => Varying.of(expensive.result())
);

const results = [];
// this forces the expensive classes to be created:
const observable = v.react((x) => { results.push(x); });
// and this calls destroy() on them:
observable.stop();
return results;
~~~

The `Varying.managed` method takes a bunch of functions that each returns some
kind of expensive resource, and a final function that takes those resources and
returns a Varying with the correct answer. It hangs on to all of these things
until somebody comes along and `get`s or `react`s on it, at which point it calls
all the resource functions, and hands those resources off to your function that
gives the correct Varying result.

When nobody cares again, it frees up those resources.

Freeing up those resources is worth a quick look: you'll see repeatedly in Janus
the method `destroy()`, which we call whenever we think we don't need an instance
anymore. This is your chance to clear event listeners, remove foreign references
that might trip up the garbage collector, and so on.

