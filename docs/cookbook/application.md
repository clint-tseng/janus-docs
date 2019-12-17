Bootstrapping Your Application
==============================

Janus is extremely modular, so it is <em>some</em> assembly required. You can piece
together a Janus application however you'd like.

Client-Side Applications
------------------------

However, most client-side projects can follow this basic ritual:

~~~ noexec
const { App, Library } = require('janus');
const stdlib = require('janus-stdlib');

// register all your views with the view library, starting with stdlib:
const views = new Library();
stdlib.view($).registerWith(views);

// option one, exporting a .registerWith(library) method in each of your views:
require('./views/my-first-view').registerWith(views);

// option two, just declaring each registration on the spot:
const { MyModel } = require('./models/my-model');
const { MyView } = require('./views/my-view');
views.register(MyModel, MyView);

// ...and so on for each of your views. then, we create an App:
const app = new App({ views });

// and we instantiate some sort of root model. maybe you request data over the
// network and deserialize it, or you just make one directly:
const myModel = new MyModel({ some: "attributes" });

// now we make a view and drop it on the page:
const myView = app.view(myModel);
$('#content').append(myView.artifact());
myView.wireEvents();
~~~

As you can see, the two primary tasks are to create an application context with
all of your view (and eventually resolver) resources, then use that context to
render some root model into a root view, and drop that onto the page.

Server/Client Hybrid Applications
---------------------------------

The [Practical Guide](/hands-on/and-the-server-too) goes in depth on managing
server-side renders.

In general, if your application runs in both contexts, it's sensible to create
some basic `base.js` file that does most of the above work:

~~~ noexec
const { App, Library } = require('janus');
const stdlib = require('janus-stdlib');

// register all your views with the view library, starting with stdlib:
const views = new Library();
stdlib.view($).registerWith(views);
require('./views/my-first-view').registerWith(views);

// then, we export an App with those resources:
const app = new App({ views });
module.exports = { app };
~~~

Which can then be used in a `client.js` bootstrapper like above:

~~~ noexec
const { app } = require('./base');

// instantiate and draw a root model:
const myModel = new MyModel({ some: "attributes" });
const myView = app.view(myModel);
$('#content').append(myView.artifact());
myView.wireEvents();
~~~

And as well in a server context as detailed in the linked chapter.

