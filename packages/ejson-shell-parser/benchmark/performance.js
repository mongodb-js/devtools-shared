/* eslint-disable no-console */
'use strict';
const Benchmark = require('benchmark');
const { default: parseEJSON } = require('../');
const { parseFilter } = require('mongodb-query-parser');

const sample = `({
  "_id3": {
    "__alias_0": "$year",
    "_id": {
      "__alias_0": "$year",
      "_id": {
        "__alias_0": "$year",
        "_id": {
          "__alias_0": "$year",
          "_id": {
            "__alias_0": "$year",
            "_id": {
              "__alias_0": "$year"
            },
          },
        },
      },
    },
  },
  "_id2": {
    "__alias_0": "$year",
    "_id": {
      "__alias_0": "$year"
    },
    "_id": {
      "__alias_0": "$year"
    },
    "_id": {
      "__alias_0": "$year"
    },
    "_id": {
      "__alias_0": "$year",
    },
  },
  "_id3": {
    "__alias_0": "$year",
    "_id": {
      "__alias_0": "$year",
      "_id": {
        "__alias_0": "$year",
        "_id": {
          "__alias_0": "$year",
          "_id": {
            "__alias_0": "$year",
            "_id": {
              "__alias_0": "$year"
            },
          },
        },
      },
    },
  }
})`;

var suite = new Benchmark.Suite();

// add tests
suite
  .add('parseEJSON', function () {
    parseEJSON(sample);
  })
  .add('parseEJSON#weak', function () {
    parseEJSON(sample, { weakParsing: true });
  })
  .add('mongodb-query-parser#insecure', function () {
    parseFilter(sample);
  })
  .add('eval', function () {
    eval(sample);
  })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
