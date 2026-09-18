import { expect } from 'chai';

import * as api from './index.js';
import { terminateWorker } from './worker-client.js';
import { restrictGlobalScope, ALLOWED_GLOBALS } from './worker.js';
import { PARSE_TEST_CASES } from './../test/parse-test-cases.js';

describe('shell-bson-parser with webworker processing', function () {
  const initialWorkerScriptUrl = process.env.TEST_WORKER_SCRIPT_URL;

  before(function () {
    process.env.TEST_WORKER_SCRIPT_URL = '../dist/worker.js';
  });

  after(function () {
    if (initialWorkerScriptUrl) {
      process.env.TEST_WORKER_SCRIPT_URL = initialWorkerScriptUrl;
    } else {
      delete process.env.TEST_WORKER_SCRIPT_URL;
    }
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

  describe('restrictGlobalScope', function () {
    it('strips capabilities not needed for parsing, keeping the JS intrinsics parsing needs', function () {
      const scope: Record<string, unknown> = Object.create(null);
      scope.fetch = function fetch() {};
      scope.require = function require() {};
      scope.process = Object.create(null);
      scope.importScripts = function importScripts() {};
      scope.XMLHttpRequest = function XMLHttpRequest() {};
      scope.Object = Object;
      scope.Array = Array;
      scope.Math = Math;

      restrictGlobalScope(scope);

      expect(scope).to.not.have.property('fetch');
      expect(scope).to.not.have.property('require');
      expect(scope).to.not.have.property('process');
      expect(scope).to.not.have.property('importScripts');
      expect(scope).to.not.have.property('XMLHttpRequest');
      expect(scope).to.have.property('Object', Object);
      expect(scope).to.have.property('Array', Array);
      expect(scope).to.have.property('Math', Math);
    });

    it('keeps every allowlisted global untouched', function () {
      const scope: Record<string, unknown> = Object.create(null);
      for (const key of ALLOWED_GLOBALS) {
        scope[key] = key;
      }

      restrictGlobalScope(scope);

      for (const key of ALLOWED_GLOBALS) {
        expect(scope).to.have.property(key, key);
      }
    });

    it('does not throw on non-configurable properties', function () {
      const scope: Record<string, unknown> = Object.create(null);
      Object.defineProperty(scope, 'nonConfigurable', {
        value: 'danger',
        configurable: false,
        enumerable: true,
      });

      expect(() => restrictGlobalScope(scope)).to.not.throw();
      expect(scope).to.have.property('nonConfigurable', 'danger');
    });
  });

  describe('terminateWorker', function () {
    it('starts a new worker after termination', async function () {
      const res1 = await api.parse('{code: "BER"}');
      expect(res1).to.deep.equal({ code: 'BER' });

      terminateWorker();

      const res2 = await api.parse('{city: "berlin"}');
      expect(res2).to.deep.equal({ city: 'berlin' });
    });
  });
});
