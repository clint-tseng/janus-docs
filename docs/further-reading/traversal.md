Traversal
=========

In effect, Traversal is MapReduce for Janus data structures, strengthened by
Janus's philosophies around functional programming and declarative programming.
With Traversal, you can perform powerful, elaborate operations on complex nested
data structures and rely upon the results adjusting as the data changes.

This can be used for a lot of different purposes, and indeed two built-in features
of the framework rely on Traversal to perform their work: data diffing and change
detection, as well as data serialization. This use of Traversal makes these operations
flexible, customizable, and powerful.

A Traversal is defined by up to four things:

* A traversal operation, which determines how the traverser itself will navigate
  and process your data.
* A mapping function that determines what to do with each key/value pair in the
  traversed source data.
* An optional recursing function that looks at each structure as a whole and can
  make a decision about whether and how to traverse it.
* An optional reducing function that reduces each mapped List to some result value.

We will discuss each one in turn, then examine their use together.

Traversal Operations
====================

Traversals can be done:

* Point-in-time with a static `Object` or `Array` result, or as a Janus `List` or
  `Map` result that will update with changes the source data.
* By preserving the original data structures (`Maps` map to `Maps`, `Lists` map
  to `Lists`), or by chewing everything down to `Lists` (`Map` keys are discarded
  and only the mapping result is preserved).

This pair of options form a two-by-two matrix, and four total methods:

* `Traversal.natural` preserves the original structures, and returns live Janus
  data structures.
* `Traversal.natural_` preserves the original structures, but returns static
  `Object` and `Array` final results.
* `Traversal.list` returns live `List`s of the mapping results, or reductions
  thereof.
* `Traversal.list_` returns static `Array`s of the mapping results, or reductions
  thereof.

This follows the underscore convention prevalent in Janus.

Different operations are well suited for different purposes. A serialization routine,
for example, would likely want to call `Traversal.natural_`, to preserve the original
structure and return a static data structure to be transformed to a wire format
and sent to a server. On the other hand, a data change detection routine would
be better served by using `Traversal.list`, which can map each data pair down
to a boolean value. In this case, Lists make more sense as a return type as a
`List[Boolean]` is easily reduced down to a `Varying[Boolean]` using `.any()`.

Mapping Data with Traversal
===========================

The `map` function you provide is called for each key/value pair in the data
structure. For `Traversal.natural` and `Traversal.list`, which return `List`s and
`Map`s, the `map` function will be called each time a data value is added or changed.

Four arguments will be provided to `map`:

* `key` is the string or integer key of the key/value pair.
* `value` is the value.
* `attribute` is the `Attribute` instance, if any, associated with the `key` in
  question.
* `object` is the data structure that is being traversed. Typically, this will
  be a List or Map.

`map` is expected to return a value of type `types.traversal`. This is a case
class set which defines a set of possible actions for the traversal to take. We
will describe each briefly.

Mapped value: `value(x)`
------------------------

The most straightforward result type, `value(x)` indicates that `x` is the mapping
result that should be output onto the resulting structure.

~~~ inspect-panel
const { value } = types.traversal;
const data = new Map({ x: 1, y: 2, z: { a: 4, b: 5 } });
return Traversal.natural({ map: (k, v) => value(v * 2) })(data);
~~~

Traverse into a substructure: `recurse(obj)`
--------------------------------------------

`recurse(obj)` will begin a recursive traversal into the given `obj`. The result
of that traversal will become the mapped value on the resulting structure. This
is equivalent to returning `value(Traversal.natural(obj))` or `value(Traversal.list(obj))`,
depending on which traversal operation you are using. Not having to deal with
the difference when writing a mapping function is a big reason to use `recurse`.

~~~ inspect-panel
const { value, recurse } = types.traversal;
const data = new Map({ x: 2, y: 3, z: new Map({ a: 4, b: 5 }) });
return Traversal.natural({
  map: (k, v) => {
    if (k === 'b') return recurse(new Map({ j: 6, k: 7 }));
    else if (v instanceof Map) return recurse(v);
    else return value(v * 2);
  }
})(data);
~~~

Notice how we are not limited to recursing into the structure that was actually
present in the source data. We take advantage of this when we implement the diff
algorithm packed with Janus, which we dissect later in this article as an example.

Delegating responsibility temporarily: `delegate(f)`
----------------------------------------------------

`delegate(f)` will call `f`, and use its result as the mapping result for this
key/value pair only. This is equivalent to returning `value(f(key, value, attr, obj))`
but is far less of a mouthful.

~~~ inspect-panel
const { value, delegate } = types.traversal;
const data = new Map({ x: 2, y: 3, z: new Map({ a: 4, b: 5, c: 'hello' }) });
return Traversal.natural_({
  map: (k, v) =>
    (typeof v === 'number')
      ? value(v * 2)
      : delegate(Traversal.default.serialize.map)
})(data);
~~~

We only care about numeric values here, so at each point along the way we push
the rest of the work off to the default serialize implementation. Notice how even
though we `delegate` the handling of `z`, which recurses into a `Map`, it is our
mapping function that is once again used to process the values within the substructure.

This is why we call this a _temporary_ delegation.

> # Aside
> There is one more nuance here which we will cover more when we move on from the
> mapping function to discuss the recursing function in the next major section:
> not only will `delegate` return control to you by the time a substructure's values
> are being processed, you actually regain control by the time the recursing function
> is called prior to processing that structure.
>
> Again, more on this later.

What if you want to permanently defer to some other handler for the entire nested
substructure? You'll want to use `defer` for that:

Deferring responsibility completely: `defer({ recurse?, map?, reduce? })`
-------------------------------------------------------------------------

`defer` is similar to `delegate`, but with two key differences. First, as you can
see, you are free to specify any of `recurse`, `map`, and `reduce`. `delegate`
only ever directly takes a `map`ping function. This is a result of the second
difference: `defer` will apply this configuration change for the entire subtree
starting at this key/value pair, rather than just using the alternative function
once.

This is useful when you know some default behaviour is fine for an entire subtree
and you want to hand the problem off.

~~~ inspect-panel
const { value, defer } = types.traversal;
const data = new Map({ x: 2, y: 3, z: new Map({ a: 4, b: 5, c: 'hello' }) });
return Traversal.natural({
  map: (k, v) => {
    if (k === 'z') return defer(Traversal.default.serialize);
    else if (v instanceof Map) return recurse(v);
    else return value(v * 2);
  }
})(data);
~~~

`Traversal.default.serialize` contains only a `map` function, but notice how our
own mapping function is no longer called to handle anything inside of `z`, and
so the numbers are not doubled.

Dependent result: `varying(v)`
------------------------------

`varying(v)` instructs the traverser to use the changing value within `v` as the
mapping result. The `Varying` object `v` should in turn carry one of the return
types discussed here.

~~~
const { value, varying, recurse } = types.traversal;
const data = new Map({ x: 2, y: new Map(), z: new Map({ a: 4, b: 5 }) });
const process = Traversal.natural({
  map: (k, v, attr, obj) =>
    (v instanceof Map)
      ? varying(v.length.map((l) => (l === 0) ? value(0) : recurse(v)))
      : value(v * 2)
});
return [ data, process(data) ].map(inspect.panel);
~~~

Here (for demonstration purposes) we don't bother computing the subobject if it's
empty. We also show here how the traversal functions are curried, so you can define
a process as a function and call it without repeatedly giving the configuration.

Nothing: `nothing`
------------------

This is exactly equivalent to returning `value(undefined)`.

Recursing into structures with Traversal
========================================

Recursion is a critical piece of the Traversal operation. If not for the need to
manage the recursion of substructures, you could simply use [`#mapPairs`](/api/map#mapPairs)
or `#flatMapPairs`](/api/map#flatMapPairs).

> Though it's a good idea to understand how the recursing operation and function
> work, it's also important to note that it is optional to actually provide a
> function. By default, Janus will just recurse right in if you don't say otherwise.

Control over recursion follows this workflow:

1. When any Traversal is invoked, the recursing function is immediately called.
   The only argument is the structure Traversal was called with, and the return
   type matches that of the mapping function as described above, and explained
   further in a moment.
2. Only if the recursing function returns `recurse(obj)` will the traverser then
   proceed to map all the key/value pairs within `obj`. The mapping function is
   called for each of these pairs.
3. If the mapping function returns `recurse(obj)`, we return to step 1 with the
   given `obj`. This means that the next step is to call your recursing function
   again, but with this new subobject.

The purpose behind these extra recursing function steps is to give you the ability
to examine a structure as a whole and either map over some variation of it, or
skip traversing into and mapping it entirely, instead returning some fixed or
computed value.

Moreover, the recursing function is called after the mapping function has asked
to `recurse` for two reasons: one is to allow control over _how_ a substructure
is recursed, but as well it is important in case you have `delegate`d mapping control
to some other function to give you the ability to affirm the course of action.

Here is a basic example of a recursing function in action:

~~~
const { recurse, varying, value } = types.traversal;
const data1 = new Map({
  a: new List([ 1, 2 ]),
  b: new Map({ x: 3, y: new List([ 4 ]) }),
  c: new List([ 5, new Map({ z: 6 }) ])
});
const data2 = new List([ 1, 2, 3, new List([ 4 ]), new Map({ x: 5 }) ]);
const process = Traversal.natural({
  recurse: (obj) => (obj instanceof List) ? varying(obj.length.map(value)) : recurse(obj),
  map: (k, v) => v.isEnumerable ? recurse(v) : value(v)
});
return [ data1, data2 ].map(process).map(inspect.panel);
~~~

> You could actually simplify a little by returning `value(obj.length)` rather
> than `varying(obj.length.map(value))`; the end result is the same to an outside
> observer.

This sample answers one critical question: given enough careful structuring, all
of the sorts of logic we describe as best suited for the recursing function _could_
be performed in your mapping function instead. So, why bother? Because as you see
with `data2` above, and you'll see again later on when we dissect the `diff` function,
there are many cases where you'd want to also apply that kind of logic to the root
data structure itself.

Lacking the recursing function, you'd have to write that same logic twice, or at
least try to extract it to a reusable place and invoke it twice: once before calling
into `Traversal` at all, and again in your mapping function. By turning the recurse
operation into a formal step, we eliminate that homework.

Reducing Traversals
===================

Now, we get to the (optional) reduce part of the MapReduce operation. Sometimes
some singular summary across your recursive data structures is the result you are
after: whether any pair computed to `true`, for example, or the sum of all values.

In these cases, you can use `Traversal.list` or `Traversal.list_` and provide a
reducing function. It ought to take the `List` result of the mapping process and
return some value. Usually, this will be a `Varying` of some kind, but any result
is allowed.

We'll start with a simpler case, just summing all the values nested in a Map:

~~~ inspect-panel
const { value, recurse } = types.traversal;
const data = new Map({ x: 1, y: 2, z: new Map({ a: 4, b: 5 }) });
return Traversal.list({
  map: (k, v) => (v instanceof Map) ? recurse(v) : value(v * 2),
  reduce: l => l.sum()
})(data);
~~~

But as noted above, the result doesn't need to be a singular `Varying` value.
All the reducing function really does is give you a chance to specify a final
step to be recursively applied to each mapped substructure once it has been
processed.

~~~ inspect-panel
const { value, recurse } = types.traversal;
const data = new Map({
  x: 1, y: 2,
  z: new Map({ a: 4, b: 5, c: new Map({ m: 7, n: 8 }) })
});
return Traversal.list({
  map: (k, v) => (v instanceof Map) ? recurse(v) : value(v % 3),
  reduce: l => l.flatten().uniq()
})(data);
~~~

The result of the reducing function is the result of each layer of traversal, whether
that result is returned to you or placed into a mapped parent structure.

Putting it all together
=======================

We'll show all the different parts of Traversal working together by taking a look
at one of the Traversal routines packed into Janus: `diff`. Here it is, adapted
a little from its native Coffeescript:

~~~
const { varying, recurse, value } = types.traversal;

const diffable = (x, y) =>
  (x != null) && (x.length != null) &&
  (y != null) && (y.length != null) &&
  (x.isMappable === y.isMappable);

const diff = {
  recurse: ([ oa, ob ]) => diffable(oa, ob)
    ? varying(Varying.mapAll(oa.length, ob.length, (la, lb) => (la !== lb)
      ? value(true)
      : recurse(oa.flatMapPairs((k, va) => ob.get(k).map(vb => [ va, vb ])))))
    : value(new Varying(oa !== ob)),

  map: (k, [ va, vb ]) => diffable(va, vb) ? recurse([ va, vb ]) : value(va !== vb),

  reduce: (list) => list.any()
};

const data1 = new Map({ a: 1, b: 2, c: new List([ 3, 4 ]), d: new Map({ e: 5 }) });
const data2 = new Map({ a: 1, b: 2, c: new List([ 3, 4 ]), d: new Map({ e: 5 }) });
return [ data1, data2, Traversal.list(diff, [ data1, data2 ]) ].map(inspect.panel);
~~~

To deeply diff two arbitrary structures, we implement every phase of the Traversal
process.

First, upon **recurse** we check to see that we actually have two structures, and
that they are of comparable type (so we don't try to diff Lists against Maps, for
example). If we don't, we just bail out with a direct comparison.

> Why the `new Varying`? If we just returned `value(oa !== ob)`, then in most
> cases the result of `diff` would be `Varying[bool]`, but in this particular
> condition we would end up with plain `bool`. Traversal is surprisingly thin,
> and it doesn't do any work to regulate or force the recursing, mapping, or
> reducing result types at any level (you can see the final sample in the reducing
> section above for another example of this).

If we have two structures that are sensible to diff, we first try to head off as
much work as we can by checking the lengths of the two structures. If they have
different cardinalities, there is no reason to actually walk each structure pair-by-pair;
they are clearly different. Only if they match in size do we command the `recurse`
operation into the structure.

But we can't just `recurse` into one structure or the other; somehow when we get
to the mapping step, we need to be able to compare a _pair_ of values at a time.
We accomplish this by zipping the structures together ahead of time using `flatMapPairs`.
We map over one structure, and at each point pull the value of the other structure
and manually zip the values together with an array literal. _This_ new structure
is what we actually recurse into.

Once we are **map**ping each data element in the zipped structure, we can then pull
the zipped values apart again. If we have two diffable structures in hand, we start
the recursion process on them, which starts us over at the recursing function (and
therefore checking diffability, then length, then recursing into a zipped substructure).
If not, we simply compare them and return the result.

In either case, the result of the mapping function will be a `bool`. In the case
of plain values, this is the result of the direct equality comparison. In the case
of a recursion, this is because of our reducing function.

We **reduce** each substructure after mapping into a single value: in this case,
a boolean indicating if any data mismatched in the whole structure. Since we are
using `Traversal.list` and we know each mapping result is a `bool`, our reducing
function gets a `List[bool]` each time, and any `true` in the `List` indicates
a difference. So we just call `.any()` on the list and the resulting `Varying[bool]`
is our final result.

As usual, the power of this whole operation is that Traversal handles data routing
and structural concerns on your behalf, leveraging `Varying` and live data structures
to solve the problem in a way that accounts for changes to the data. And as usual,
we try to do this in a way that leaves as much control in your hands as possible,
leveraging simple primitives that you understand how to manipulate. You can see
this in how each recursive step takes the unorthodox `[ oa, ob ]` parameter rather
than a `List` or `Map`.

Recap
=====

Hopefully, this look at Traversal has been enlightening rather than frightening.
There are a great many problems that can be solved with Traversal, and the major
design goal has always been to allow flexible, adaptable solutions that don't
fall apart once options, parameters, and special cases become necessary at different
points in the data tree.

This is done in two ways:

* First, by Traversal's recursing MapReduce strategy, which allows behaviour to
  be specified at each point in the data processing procedure.
* Second, by the use of case class results that instruct the traversal process
  on how to proceed. Especially with tools like `defer`, `delegate`, and `varying`,
  these instructions allow a lot of flexibility in processing paths without your
  need to worry about rote homework.

If you would like to see more examples, there are some in the [chapter on Lists](/theory/lists#a-broader-perspective-enumerable-traversal).

