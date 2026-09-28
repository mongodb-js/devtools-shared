# @mongodb-js/shell-bson-parser

Parses valid MongoDB Shell queries.
This library does not validate that these queries are correct. It's focus is on parsing untrusted input. You may wish to use something like https://github.com/mongodb-js/mongodb-language-model to achieve this.

This library creates an AST from the proposed input, and then traverses this AST to check if it looks like a valid MongoDB query. If it does, the library will then evaluate the code to produce the parsed query.

Parsing runs off the main thread inside a Worker, so `parse` is asynchronous and returns a `Promise`. See [Worker](#worker) for details.

This library currently supports three different modes for parsing queries:

**strict**: [default] Disallows comments and calling methods

```javascript
import parse from '@mongodb-js/shell-bson-parser';

const query = await parse(
  `{
    _id: ObjectID("132323"),
    simpleCalc: 6,
    date: new Date(1578974885017)
  }`,
  { mode: 'strict' },
);

/*
  query = { _id: ObjectID("132323"), simpleCalc: 6, date: Date('1578974885017') }
*/
```

**weak**: Disallows comments, allows calling methods

```javascript
import parse from '@mongodb-js/shell-bson-parser';

const query = await parse(
  `{
    _id: ObjectID("132323"),
    simpleCalc: Math.max(1,2,3) * Math.min(4,3,2)
  }`,
  { mode: 'weak' },
);

/*
  query = { _id: ObjectID("132323"), simpleCalc: 6 }
*/
```

**loose**: Supports calling methods on Math, Date and ISODate, allows comments

```javascript
import parse from '@mongodb-js/shell-bson-parser';

const query = await parse(
  `{
    _id: ObjectID("132323"), // a helpful comment
    simpleCalc: Math.max(1,2,3) * Math.min(4,3,2)
  }`,
  { mode: 'loose' },
);

/*
  query = { _id: ObjectID("132323"), simpleCalc: 6 }
*/
```

The options object passed into parse has the following parameters:

```javascript
{
  mode: ('loose' || 'weak' || 'strict') // Will assign (allowMethods & allowComments) for you
  allowMethods: true, // Allow function calls, ie Date.now(), Math.Max(), (new Date()).getFullYear()
  allowComments: true, // Allow comments (// and /* */)
}
```

The flags can be set to override the default value from a given mode, ie:

```javascript
{
  mode: 'strict',
  allowComments: true
}
```

This options object will disallow method calls, but will allow comments

## Worker

Every call to `parse` is sent to a shared worker (using [`web-worker`](https://github.com/developit/web-worker), so it works in both Node.js and browsers). The worker is created lazily on the first call and reused for later calls. BSON values are serialized across the worker boundary and rebuilt as `bson` instances on the calling side.

If parsing throws inside the worker, the returned promise rejects with the error message.

Call `terminateWorker()` to shut down the worker (for example in test teardown or when unmounting). Any pending `parse` calls are rejected. The next `parse` call starts a new worker.

```javascript
import { parse, terminateWorker } from '@mongodb-js/shell-bson-parser';

const query = await parse('{ a: 1 }');

terminateWorker();
```

This package is ESM only.
