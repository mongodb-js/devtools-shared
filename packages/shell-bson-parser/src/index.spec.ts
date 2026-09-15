import assert from 'assert';
import * as bson from 'bson';

import * as api from './index';
import { terminateWorker } from './worker-client';
import { handleRequest } from './worker';
import type { WorkerRequest } from './worker-client';
import { VALIDATION_USE_CASES } from './../test/validation-test-cases';

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

describe('index (worker-backed async API)', function () {
  after(function () {
    terminateWorker();
  });

  describe('parse', function () {
    it('parses shell BSON syntax into real BSON instances', async function () {
      const res = await api.parse(
        '{_id: ObjectId("58c33a794d08b991e3648fd2")}',
      );
      assert.deepEqual(res, {
        _id: new bson.ObjectId('58c33a794d08b991e3648fd2'),
      });
    });

    it('preserves types that structured clone alone would lose', async function () {
      const res = await api.parse('{value: NumberLong(1)}');
      assert.ok(res.value instanceof bson.Long);
      assert.equal(res.value.toNumber(), 1);
    });

    it('is exposed as the default export', async function () {
      const res = await api.default('{ x: 1 }');
      assert.deepEqual(res, { x: 1 });
    });
  });

  describe('toJSString', function () {
    it('stringifies a document with BSON-aware formatting', async function () {
      const str = await api.toJSString({ a: { $exists: true } }, 0);
      assert.equal(str, '{a:{$exists:true}}');
    });

    it('round-trips a BSON value through the worker', async function () {
      const str = await api.toJSString(
        { a: new bson.ObjectId('507f191e810c19729de860ea') },
        0,
      );
      assert.equal(str, "{a:ObjectId('507f191e810c19729de860ea')}");
    });
  });

  describe('validate', function () {
    it('returns the parsed value for a valid filter', async function () {
      const res = await api.validate('filter', '{value: NumberLong(1)}');
      assert.equal(res.value.toNumber(), 1);
    });

    it('returns false for an invalid filter', async function () {
      const res = await api.validate('filter', '{value: NumberLong(1)');
      assert.equal(res, false);
    });

    it('returns false for an unknown validator name', async function () {
      const res = await api.validate('doesNotExist', 'anything');
      assert.equal(res, false);
    });

    for (const [key, tests] of Object.entries(VALIDATION_USE_CASES)) {
      it(`should validate ${key}`, async function () {
        for (const { input, expected } of tests) {
          const res = await api.validate(key, input);
          assert.deepEqual(res, expected);
        }
      });
    }
  });
});
