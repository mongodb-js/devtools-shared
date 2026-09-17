import { expect } from 'chai';
import { toJSString } from './stringify';
import { parse } from './parse';
import {
  TO_JS_STRING_TEST_CASES,
  TO_JS_STRING_ROUND_TRIP_TEST_CASES,
  filterOptions,
} from '../test/stringify-test-cases';

describe('stringify', function () {
  for (const { title, input, indent, expected } of TO_JS_STRING_TEST_CASES) {
    it(title, function () {
      expect(toJSString(input, indent)).to.equal(expected);
    });
  }

  for (const { title, input, indent } of TO_JS_STRING_ROUND_TRIP_TEST_CASES) {
    it(title, function () {
      const jsString = toJSString(input, indent) as string;
      expect(parse(jsString, filterOptions)).to.deep.equal(input);
    });
  }
});
