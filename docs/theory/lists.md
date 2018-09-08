Lists
=====

You've already seen quite a few `List`s so far. We've tried to to do too much
with them besides create them, but as you might have expected, Janus's take on
these data structures (and indeed, the reason it bothers to reimplement them at
all) offers data transformations like `map` that, once declared, are respected
and upheld throughout time as your data changes.

And as we get into Maps and Lists, it's relevant to note that while we try to
imbue that spirit into these structures, we will necessarily start to stray a
little from resolutely using `Varying` for everything. After all, Varying is a
box intrinsically built to represent a single value throughout time, and a box
that structures multiple values together across all of time will necessarily
require some other treatment.

But seen from a different perspective, the same general rules will apply: when
some transformation is defined on some Map or List, the resulting Map or List
will apply that transformation across all of time. In fact, it will be relatively
common that you end up mapping eg `Varying[List[x]]` to another `Varying[List[x]]`
with code that looks something like this:

~~~
const v = new Varying(new List([ 1, 2, 3, 4, 5 ]));
return v.map(l => l.map(x => x * 2));
~~~

This way, we retain our fundamental property that we account for all values for
all of time: the mapped list will ensure that our `x * 2` rule always holds for
the transformed list, and we wrap that in a Varying to ensure that if our reference
changes&mdash;if we start talking about a different list altogether&mdash;that
we are still computing the correct result.

> There _is_ actually an important difference, at least in this early version of
> Janus: Maps and Lists perform their transformations _eagerly_. Unlike Varying,
> which doesn't do any work unless it has to, Map and List don't (yet) carry this
> same property.

So, bear that in mind as we dive in and start poking around Lists, Maps, and Models.

