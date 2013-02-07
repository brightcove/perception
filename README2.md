
# perception

Perception is an application for capturing and aggregating perceived load times of web-based assets.

## why perception?

When trying to performance optimize the delivery of web assets, it can be hard to determine when something has meaningfully loaded.
For example, is it when the DOM is ready?
Is it when all the images have loaded?
Is it when CSS styles are available, or after the first repaint?

The ultimate arbiter of load time is human perception.
The page or app is loaded when users think that it has.
Capturing, aggregating and presenting this data is the purview of this application.

## installing couchapp prerequisites

Before you install perception, you'll need to have the following prerequisites:

* couchdb
* node/npm
* node.couchapp.js

Installing couchdb and node.js vary by platform, but package managers or binaries are available for most operating systems.

Mac OSX users can use homebrew:

```
brew install couchdb
brew install node
```

You can test that you have these installed correctly using the `which` command:

```
$ which couchdb
/usr/local/bin/couchdb
$ which node
/usr/local/bin/node
$ which npm
/usr/local/bin/npm
```

Finally, install the `couchapp` command line tool via `npm`:

```
sudo npm install -g couchapp
```

Note: node.js is not required to run the couchapp in production.
For that, only couchdb is required.
Node.js is only used in this project as a scripting language for deploying the couchapp.

## running couchdb

You can test if couchdb is running by trying to visit [http://localhost:5984/](http://localhost:5984/)

If couchdb is running, you'll get a short JSON response.
If not, you can run it from the command line like so:

```
$ couchdb
Apache CouchDB 1.2.1 (LogLevel=info) is starting.
Apache CouchDB has started. Time to relax.
```

Once couchdb is running, you can access its Futon web interface: [http://localhost:5984/_utils/](http://localhost:5984/_utils/)

## installing perception

Before you install perception the first time, you must pull in the npm dependencies.
This is easily done with `npm install`:

```
$ npm install
npm http GET https://registry.npmjs.org/couchapp
npm http GET https://registry.npmjs.org/watch
npm http GET https://registry.npmjs.org/request
couchapp@0.9.1 node_modules/couchapp
├── watch@0.5.1
└── request@2.12.0
```

If you don't already have a couchdb database, you can create one with `curl`.
Here we assume that your couch dabatase will be called "perception", but you can call it something else:

```
curl -XPUT http://localhost:5984/perception
```

Once your target database exists, use `couchapp` to deploy the app into couch:

```
$ couchapp push app.js http://localhost:5984/perception
Preparing.
Serializing.
PUT http://localhost:5984/perception/_design/app
Finished push. 2-7b4d1456e90c988c6a86b6476d08bfb1
```

After perception is deployed, you can access it via its `_rewrite` location: [http://localhost:5984/perception/_design/perception/_rewrite/](http://localhost:5984/perception/_design/perception/_rewrite/)

## updating perception

After making changes to the source code, you can redeploy the app to couch using the `couchapp push` command as before:

```
$ couchapp push app.js http://localhost:5984/perception
```

Redeploying the app code does not affect the stored data in the perception database.
