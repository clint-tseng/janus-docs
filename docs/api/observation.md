# Observation

When [`Varying#react`](Varying#react) is called, an `Observation` ticket is returned.
All it really contains is some tracking information, and a `#stop` method:

## Reaction Management

### #stop
#### .stop(): void
* !IMPURE

Stops the reaction associated with this `Observation` ticket.

~~~
const results = [];
const v = new Varying(1);
const observation = v.react(x => { results.push(x); });
v.set(2);
observation.stop();
v.set(3);
return results;
~~~

