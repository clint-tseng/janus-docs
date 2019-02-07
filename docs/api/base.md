# Base

`Base` serves as the base class for much of Janus, especially the data structures.
It provides basic eventing via [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2)
and many tools and facilities for resource management and lifecycle management.

The `Base` class is discussed in our [chapter on Resource Management](/theory/resource-management#the-base-class).

## Events

Events are typically used by Janus to communicate internally between related data
structures. Derived Lists, for example, [use events to communicate changes](/theory/lists#list-internals)
so that downstream List transformations update their own data appropriately.

We favor `Varying`-based public interfaces, but if you are building your own core
Janus components as part of your application, you may find the availability of
events convenient.

### #on
#### .on(name: String, callback: (…\* -> void)): self

* !IMPURE

Equivalent to and delegates to [`EventEmitter2#on`](https://github.com/EventEmitter2/EventEmitter2#emitteronevent-listener).
In brief, creates an event listener which calls `callback` when the `name` event
is emitted from this `Base` instance. Various namespace and wildcard options are
available; see the EventEmitter2 documentation for information on these.

> # Note
> You should strongly consider using [`#listenTo`](#listenTo) instead, which ensures
> that event listeners are halted when objects are `destroy`ed.

~~~
const results = [];
const obj = new Base();
obj.on('get_excited', about => { results.push(`hooray ${about}!`); });

obj.emit('get_excited', 'functional programming');
return results;
~~~

### #off
#### .off(name: String, callback: (…\* -> void)): self

* !IMPURE

The opposite of `#on`; given an event `name` and a `callback` that was previously
given to `#on` or `#listenTo`, cancels that event listener. Delegates to
[`EventEmitter2#off`](https://github.com/EventEmitter2/EventEmitter2#emitteroffevent-listener).

~~~
const results = [];
const obj = new Base();
const callback = (about) => { results.push(`hooray ${about}!`); };
obj.on('get_excited', callback);

obj.emit('get_excited', 'functional composition');
obj.off('get_excited', callback);
obj.emit('get_excited', 'object-orientation');
return results;
~~~

### #emit
#### .emit(name: String, …arguments: …\*): Boolean

* !IMPURE

Causes an event of the given `name` with the event `arguments` to be emitted from
this object. Delegates to [`EventEmitter2#emit`](https://github.com/EventEmitter2/EventEmitter2#emitteremitevent-arg1-arg2-).

Returns a `Boolean` indicating whether the event had listeners or not.

~~~
const results = [];
const obj = new Base();
obj.on('get_excited', about => { results.push(`hooray ${about}!`); });

obj.emit('get_excited', 'monads');
return results;
~~~

### #listeners
#### .listeners(name: String): Array\[(…\* -> void)\]

Another method that directly [delegates to EventEmitter2](https://github.com/EventEmitter2/EventEmitter2#emitterlistenersevent),
`#listeners` returns an array containing the registered listeners for the given
`name`. The EventEmitter2 documentation suggests that this array may be manipulated
to directly modify the registered listeners.

~~~
const obj = new Base();
obj.on('get_excited', about => { results.push(`hooray ${about}!`); });

return [
  obj.listeners('get_excited'), // TODO: seems wrong
  obj.listeners('other_event')
];
~~~

### #removeAllListeners
#### .removeAllListeners(): self

* !IMPURE

The last of the methods that delegates directly to [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2#emitterremovealllistenersevent).
Called with no arguments, all event listeners on this object are immediately
removed.

~~~
const results = [];
const obj = new Base();
const callback = (about) => { results.push(`hooray ${about}!`); };
obj.on('get_excited', callback);

obj.emit('get_excited', 'functional composition');
obj.removeAllListeners();
obj.emit('get_excited', 'object-orientation');
return results;
~~~

#### .removeAllListeners(name: String): self

* !IMPURE

Called with an event `name`, only listeners for that `name` are removed.

~~~
const results = [];
const obj = new Base();
const callback = (about) => { results.push(`hooray ${about}!`); };
obj.on('get_excited', callback);

obj.emit('get_excited', 'functional laziness');
obj.removeAllListeners('other_event');
obj.emit('get_excited', 'time independence');
obj.removeAllListeners('get_excited');
obj.emit('get_excited', 'imperative programming');
return results;
~~~

### #listenTo
#### .listenTo(target: Base, name: String, callback: (…\* -> void)): self

* !IMPURE

Where [`#on`](#on) involves only the target `Base` object (the one on which `.on`
is invoked), whose event `name` is to be listened to, `.listenTo` involves two
`Base` objects.

`.listenTo` _takes_ the `target`, whose event `name` is to be listened to and
which should call `callback` when the event is emitted, `.listenTo` is called on
the `Base` resource on whose behalf the work is being done.

As an example, if you have a `List` `original` and a second `List` `mapped`, and
you are listening to `added` on `original` so that you can keep `mapped` up to
date, then in this case the work is being done on behalf of `mapped`. Once `mapped`
is no longer useful or no longer exists, there is no more reason for the work to
be done. So here we would call `mapped.listenTo(original, 'added', …)`.

Unlike `#on`, events created via `listenTo` are automatically cancelled when the
`Base` object is `destroy`ed. In addition, event listeners created via `listenTo`
can be cancelled via `#unlistenTo`.

~~~
const results = [];
const original = new Base(), announcer = new Base();
announcer.listenTo(original, 'get_excited', about => {
  results.push(`hooray ${about}!`);
});

original.emit('get_excited', 'lambda calculus');
announcer.destroy();
original.emit('get_excited', 'mutability');
return results;
~~~

### #unlistenTo
#### .unlistenTo(target: Base): self

* !IMPURE

Event listeners created with `#listenTo` can be removed wholesale with `#unlistenTo`,
which takes the `target` object to which this `Base` object should no longer
listen to at all, and clears those listeners out. This is a one-directional operation;
`alice.unlistenTo(bob)` stops Alice from listening to Bob, but not the other way
around.

Any listeners on objects other than `target` are unaffected.

~~~
const results = [];
const original = new Base(), announcer = new Base();
announcer.listenTo(original, 'get_excited', about => {
  results.push(`hooray ${about}!`);
});

original.emit('get_excited', 'lambda calculus');
announcer.unlistenTo(original);
original.emit('get_excited', 'mutability');
return results;
~~~

## Varying Observation

### #reactTo

This method is provided to complement `varying.react(…)` in the same way that
[`#listenTo`](#listenTo) is provided to complement [`#on`](#on): so that the work
created by this reaction can be automatically terminated by the framework should
it no longer be necessary.

Specifically, if the `Base` object `base` is `destroy`ed, all observations created
via `base.reactTo` are stopped.

#### .reactTo(v: Varying, callback: (T -> void)): Observation

* !IMPURE

Given `Varying` `v` and a `callback` function, creates a reaction and returns an
`Observation` as if `v.react(callback)` had been invoked.

~~~
const varying = new Varying(14);
const list = new List(); // List extends Base
list.reactTo(varying, value => { list.add(value); });

varying.set(27);
list.destroy();
varying.set(42);
return list;
~~~

#### .reactTo(v: Varying, immediate: Boolean, callback: (T -> void)): Observation

* !IMPURE

Given additionally an `immediate` parameter, that boolean value will be passed
along to [`Varying#react`](Varying#react) as if `v.react(immediate, callback)`
had been called. As with that invocation, if `immediate` is `false` then the
`callback` will not be called with the initial value at time of `.reactTo`.

~~~
const varying = new Varying(14);
const list = new List(); // List extends Base
list.reactTo(varying, false, value => { list.add(value); });

varying.set(27);
list.destroy();
varying.set(42);
return list;
~~~

## Lifecycle Management

While most of `Base` pertains to resource management, these methods explicitly
control the `Base` object's lifecycle, the end of which triggers many of the
`destroy` cleanup operations described above.

### #destroyWith
#### .destroyWith(other: Base): self

* !IMPURE

When `other` is `destroy`ed, this `Base` object shall be `destroy`ed as well.
This is done by listening to the `destroying` event on `other`, and is useful
for dependent resources that don't make sense without their parent.

### #destroy
#### .destroy(): void

* !IMPURE

Called to indicate that some object is no longer needed by the process that
instantiated it. If `Base@managed` or `#tap` have been used to share this resource
across multiple dependents, destruction will not actually occur until all resources
have called `#destroy`.

When destruction does occur, the following operations happen in this order:

* A `destroying` event is emitted on the marked object.
  * As a result of this, by default if the object has been added to any `List`s
    it will be automatically removed from them.
* All listeners the object held on other objects via `#listenTo` are removed.
* All observations the object held on `Varying`s via `#reactTo` are stopped.
* All listeners _to_ this object are removed, whether they were created via `#on`
  or `#listenTo`.
* `#_destroy` is invoked on the object. This does nothing by default, but you can
  override it to perform your own cleanup operations.
* `#__destroy` is invoked on the object. This method should _not_ be overridden;
  it is reserved for cleanup operations by framework internals.

Since Javascript does not feature manual `free` operations, the goal and job of
`#destroy` is to remove as many references to and from the object as possible,
so that garbage collection may occur.

### @managed
#### Base.managed(void -> Base): (void -> Base)

`Base@managed` is covered in detail at the end of the [section on `Base`](/theory/resource-management#the-base-class).
In brief, `@managed` takes a function that returns a `Base` object, and returns
a function that vends that `Base` object when called. Its utility is that when
the returned function is called, `@managed` knows when it has already vended the
resource and it is still alive, in which case that extant resource is returned.

If the resource has not been instantiated, or has been destroyed since it was,
then a new one is created with your given function. Under the covers, `@managed`
uses `#tap` to track the additional dependents.

~~~
const data = new Map({ a: 1, b: 2, c: 3 });
const computation = Base.managed(() => data.enumerate());

const dataKeysOne = computation();
data.set('d', 4);
const dataKeysTwo = computation();
dataKeysOne.destroy();
data.set('e', 5);
dataKeysTwo.destroy();
data.set('f', 6);
return [ dataKeysOne, dataKeysTwo ];
~~~

### #tap
#### .tap(): self

* !IMPURE

`#tap` is primarily used in conjunction with `Base@managed`, which provides usage
accounting and lifecycle management for shared resources. Each time `#tap` is called,
it takes one additional invocation of `#destroy` to actually destroy the object.

~~~
const results = [];
const resource = new Base();
resource.on('destroying', () => { results.push('destroying'); });

resource.tap();
results.push('calling destroy');
resource.destroy();
results.push('calling destroy');
resource.destroy();
return results;
~~~

## Extending Base (Overrides)

There are a couple of things to keep in mind when `extend`ing `Base`:

### @constructor
#### new Base(): Base

When extending `Base`, remember to call `super()` in your constructor, so that
essential resource management and eventing accounting structures are set up
appropriately.

### #\_destroy
#### .\_destroy(): void

Override `_destroy` to specify actions to be carried out when the `Base` object
is `destroy()`ed. This might include `.destroy()`ing any subresources instantiated
(though in these cases you may consider using [`#destroyWith`](#destroyWith) at
instantiation time instead), or otherwise freeing up objects that should no longer
be needed.

