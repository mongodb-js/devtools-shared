# mongodb-query-parser

> Safe parsing and validation for MongoDB queries (filters), projections, and more.

## Example

Turn some JS code as a string into a real JS object safely and with no bson type loss:

```javascript
require('mongodb-query-parser')('{_id: ObjectId("58c33a794d08b991e3648fd2")}');
// >>> {_id: ObjectId('58c33a794d08b991e3648fd2'x)}
```

### Usage with codemirror

```javascript
var parser = require('mongodb-query-parser');
var query = '{_id: ObjectId("58c33a794d08b991e3648fd2")}';
// What is this highlighting/language mode for this string?
parser.detect(query);
// >>> `javascript`

var queryAsJSON = '{"_id":{"$oid":"58c33a794d08b991e3648fd2"}}';
// What is this highlighting/language mode for this string?
parser.detect(queryAsJSON);
// >>> `json`

// Turn it into a JS string that looks pretty in codemirror:
parser.toJavascriptString(parse(query));
// >>> '{_id:ObjectId(\'58c33a794d08b991e3648fd2\')}'
```

### Extended JSON Support

```javascript
var bson = require('bson');
var parser = require('mongodb-query-parser');
var queryAsAnObjectWithTypes = parser.parseFilter(query);

// Use extended json to prove types are intact
bson.EJSON.stringify(queryAsAnObjectWithTypes);
// >>> '{"_id":{"$oid":"58c33a794d08b991e3648fd2"}}'

var queryAsJSON = '{"_id":{"$oid":"58c33a794d08b991e3648fd2"}}';
parser.detect(queryAsJSON);
// >>> `json`
```

## Migrations

We aim to not have any API breaking changes in this library as we consider it stable, but breakages may occur whenever we upgrade a core dependency or perform a major refactor.

We have a [migration guide](MIGRATION.md) which covers what to look out for between releases.

## Related

- [`mongodb-stage-validator`](https://github.com/mongodb-js/stage-validator) Parse and validate MongoDB Aggregation Pipeline stages.
- [`@mongodb-js/compass-query-bar`](https://github.com/mongodb-js/compass-query-bar) Compass UI Plugin that uses `mongodb-query-parser` for validation.

## License

Apache 2.0
