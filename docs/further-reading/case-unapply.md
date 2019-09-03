Custom Unapply (and some Case internals)
========================================

It turns out that case classes don't directly store the value you hand them.
Instead, they store a function that applies its values to another function. Here,
that's a confusing statement, so let's see a simplified example in code:

~~~
const applyTwoValues = (x, y) => (f) => f(x, y);
const printPoint = (x, y) => `(${x}, ${y})`;

const point = applyTwoValues(7, 8);
return point(printPoint);
~~~

This little higher-order function trick lets us store two values, and forward
them later on into some process that expects two values. This seems a little bit
fussy in the above example, because all of the code directly understands that
two values are involved, and what those values mean&mdash;it is all the equivalent
of application code. But part of the point of our case classing system is that
it doesn't want or need to understand these details.

So, let's again build a simplified example in code, this time incorporating a
boxing concept somewhat similar to our case classes:

~~~
class Point {
  constructor(unapply) { this.unapply = unapply; }
  extract(f) { return this.unapply(f); }
  map(g) { return new Point(f => f(this.unapply(g))); }
}

const point2d = (x, y) => new Point(f => f(x, y));
const point3d = (x, y, z) => new Point(f => f(x, y, z));

const printPoint = (...scalars) => `(${scalars.join(', ')})`;

return [
  point2d(12, 31).extract(printPoint),
  point3d(0, 3, 7).extract(printPoint),

  point2d(3, 4)
    .map((x, y) => (x > 0) && (y > 0))
    .extract(isPositive => isPositive ? '+' : '-')
];
~~~

By utilizing this trick, we can create a generic class that accepts points of
any dimension and provides some basic, useful operations on top of them.

And we can implement `map` just by remembering the mapping function, and slapping
it between the original `unapply` and the final `extract` whenever it is actually
required&mdash;we don't have to actually do the mapping work until someone wants
it.

But notice what happens, for example after we do the `.map` operation on the last
point.  We end up with something that says `Point`, but contains only a single
value which doesn't actually represent a point, exactly. Similarly, when you map
on a multi-arity case class, the result probably isn't exactly really that case
class anymore; it has some other shape.

This awkwardness means that we recommend extreme caution when using multi-arity
case classes, particularly with regards to the mapping and getting operations.
`match` still works exactly as intended, because all match does is take your
matching function and feed it to the `unapply` associated with that case class.
But `map` and the other methods start to lose some of their meaning.

> Why is the function called `unapply`? Partly because of historical reasons,
> because this is what Scala calls it. But it does have some logic to it: you
> apply your parameters into the case class, and then it unapplies them back out
> into your matching function.

And this last bit, the fact that we want to fulfill the `match(success((x) => …`
syntax regardless of what a `success` case class may actually represent structurally,
is the final detail we need in order to actually be able to write our own custom
unapply functions on top of case classes, as the first argument must always be
explicitly captured. (It's also why we contrived the Point class above instead
of directly jumping to the real deal.)

Let's take our previous magnitude example, for instance. Up above, we hardcoded
a factor of `8`, but it would be nice to be able to specify some factor as a
part of the data. This would mean that `raw` takes two values, `x` and `y`, while
`scaled` wants three: `x`, `y`, and some `factor`.

~~~
const { sqrt } = Math;
const square = (x) => x * x;

const { raw, scaled } = Case.build({
  raw: (kase) => (x, y) => new kase(x, f => f(x, y)),
  scaled: (kase) => (x, y, factor) => new kase(x, f => f(x, y, factor))
});

const magnitude = match(
  raw((x, y) => sqrt(square(x) + square(y))),
  scaled((x, y, factor) => factor * magnitude(raw(x, y)))
);

return [
  magnitude(raw(3, 4)),
  magnitude(raw(5, 12)),
  magnitude(scaled(20, 21, 8))
];
~~~

This syntax will hopefully improve in the future with some sort of fancy functional
trick, but the gist of it is that each custom unapply takes the actual case class
constructor that represents it, then whichever arguments suits its purpose, and
returns an actual instance of that constructor:

~~~ noexec
(kase) => (/* custom apply */) => new kase(firstArgument, f => f(/* custom unapply */))
~~~

The constructor wants two arguments: it always wants the very first parameter as-is,
because this is what the matching syntax desires (again, `match(success((x) => …`).
The second argument is your custom unapply, like we saw above with the Point example,
which takes a function and applies the appropriate arguments into it.

> Why do things in this roundabout way? For one, it sort of gives Janus an out.
> Either you are using the default, in which case nice tools like `map` and `orElse`
> are extremely well-defined and easy to use, or else you've wandered off the path,
> and while this is a supported customization the opaqueness of the implementation
> means there's no way we can guarantee the correctness of those nice tools.
>
> As well, part of this is the fact that flexibility and power can be had out of
> this inversion of control, and as Janus is young we'd like to see if people get
> good use out of this abstraction. If nobody is interested, do not be surprised
> to see this approach evolve out of the framework in favor of something more
> straightforward.

