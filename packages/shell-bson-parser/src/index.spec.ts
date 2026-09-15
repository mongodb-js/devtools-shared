import { expect } from 'chai';

import * as api from './index';
import { terminateWorker } from './worker-client';
import { handleRequest } from './worker';
import type { WorkerRequest } from './worker-client';
import { VALIDATION_TEST_CASES } from './../test/validation-test-cases';
import { PARSE_TEST_CASES } from './../test/parse-test-cases';
import {
  TO_JS_STRING_TEST_CASES,
  TO_JS_STRING_ROUND_TRIP_TEST_CASES,
} from './../test/tojsstring-test-cases';

class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage(message: WorkerRequest) {
    queueMicrotask(() => {
      const response = handleRequest(structuredClone(message));
      this.onmessage?.({ data: structuredClone(response) });
    });
  }
  terminate() {}
}

(global as any).Worker = FakeWorker;

describe('shell-bson-parser with webworker processing', function () {
  after(function () {
    terminateWorker();
  });

  describe('parse', function () {
    for (const { title, input, options, expected } of PARSE_TEST_CASES) {
      it(title, async function () {
        const res = await api.parse(input, options);
        expect(res).to.deep.equal(expected);
      });
    }
  });

  describe('toJSString', function () {
    for (const { title, input, indent, expected } of TO_JS_STRING_TEST_CASES) {
      it(title, async function () {
        const res = await api.toJSString(input, indent);
        expect(res).to.deep.equal(expected);
      });
    }
    for (const { title, input, indent } of TO_JS_STRING_ROUND_TRIP_TEST_CASES) {
      it(title, async function () {
        const jsString = await api.toJSString(input, indent);
        const parsed = await api.parse(jsString);
        expect(parsed).to.deep.equal(input);
      });
    }
  });

  describe('validate', function () {
    for (const [key, tests] of Object.entries(VALIDATION_TEST_CASES)) {
      it(`should validate ${key}`, async function () {
        for (const { input, expected } of tests) {
          const res = await api.validate(key, input);
          expect(res).to.deep.equal(expected);
        }
      });
    }
  });
});
