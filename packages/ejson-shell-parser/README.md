# ejson-shell-parser

Parses valid MongoDB EJSON Shell queries.
This library does not validate that these queries are correct. It's focus is on parsing untrusted input. You may wish to use something like https://github.com/mongodb-js/mongodb-language-model to achieve this.

This library creates an AST from the proposed input, and then traverses this AST to check if it looks like a valid MongoDB query. If it does, the library will then evaluate the code to produce the parsed query.

This library currently supports three different modes for parsing queries:

**strict**: [default] Disallows comments and calling methods

```javascript
import parse from 'ejson-shell-parser';

const query = parse(
  `{
    _id: ObjectID("132323"),
    simpleCalc: 6,
    date: new Date(1578974885017)
  }`,
  { mode: 'strict' }
);

/*
  query = { _id: ObjectID("132323"), simpleCalc: 6, date: Date('1578974885017') }
*/
```

**weak**: Disallows comments, allows calling methods

```javascript
import parse from 'ejson-shell-parser';

const query = parse(
  `{
    _id: ObjectID("132323"),
    simpleCalc: Math.max(1,2,3) * Math.min(4,3,2)
  }`,
  { mode: 'weak' }
);

/*
  query = { _id: ObjectID("132323"), simpleCalc: 6 }
*/
```

**loose**: Supports calling methods on Math, Date and ISODate, allows comments

```javascript
import parse from 'ejson-shell-parser';

const query = parse(
  `{
    _id: ObjectID("132323"), // a helpful comment
    simpleCalc: Math.max(1,2,3) * Math.min(4,3,2)
  }`,
  { mode: 'loose' }
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
