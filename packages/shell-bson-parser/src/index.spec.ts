import { expect } from 'chai';
import sinon from 'sinon';
import vm from 'vm';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as WebWorkerModule from 'web-worker';

import * as api from './index.js';
import { terminateWorker, callWorker } from './worker-client.js';
import {
  restrictGlobalScope,
  restrictObjectPrototype,
  ALLOWED_GLOBALS,
  DISALLOWED_PROTOTYPE_PROPS,
} from './worker.js';
import { PARSE_TEST_CASES } from './../test/parse-test-cases.js';

const WebWorker = (WebWorkerModule as unknown as { default: typeof Worker })
  .default;

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
      expect(scope).to.not.have.property('importScripts');
      expect(scope).to.not.have.property('XMLHttpRequest');
      expect(scope).to.have.property('process');
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

  describe('lockdownObjectPrototype', function () {
    let originalDescriptors: Record<string, PropertyDescriptor | undefined>;
    beforeEach(function () {
      originalDescriptors = Object.create(null);
      for (const key of DISALLOWED_PROTOTYPE_PROPS) {
        originalDescriptors[key] = Object.getOwnPropertyDescriptor(
          Object.prototype,
          key,
        );
      }
    });

    afterEach(function () {
      for (const key of DISALLOWED_PROTOTYPE_PROPS) {
        const descriptor = originalDescriptors[key];
        if (descriptor) {
          Object.defineProperty(Object.prototype, key, descriptor);
        }
      }
    });

    it('removes every disallowed accessor from Object.prototype', function () {
      restrictObjectPrototype();

      for (const key of DISALLOWED_PROTOTYPE_PROPS) {
        expect(Object.prototype).to.not.have.property(key);
        expect(({} as Record<string, unknown>)[key]).to.equal(undefined);
      }
    });
  });

  describe('terminateWorker', function () {
    let terminateSpy: sinon.SinonSpy;

    beforeEach(function () {
      terminateSpy = sinon.spy(WebWorker.prototype, 'terminate');
    });

    afterEach(function () {
      terminateSpy.restore();
      terminateWorker();
    });

    it('actually calls terminate() on the underlying worker, then spins up a new one', async function () {
      const res1 = await api.parse('{code: "BER"}');
      expect(res1).to.deep.equal({ code: 'BER' });
      expect(terminateSpy.called).to.equal(false);

      terminateWorker();
      expect(terminateSpy.calledOnce).to.equal(true);

      const res2 = await api.parse('{city: "berlin"}');
      expect(res2).to.deep.equal({ city: 'berlin' });

      expect(terminateSpy.calledOnce).to.equal(true);
    });
  });

  it('strips dangerous globals and locks down Object.prototype when the real worker starts', async function () {
    const workerBundlePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'dist',
      'worker.js',
    );
    const code = await fs.readFile(workerBundlePath, 'utf8');

    const sandbox: Record<string, unknown> = Object.create(null);
    sandbox.postMessage = function postMessage() {};
    sandbox.fetch = function fetch() {};
    sandbox.require = function require() {};
    sandbox.importScripts = function importScripts() {};
    sandbox.XMLHttpRequest = function XMLHttpRequest() {};
    sandbox.self = sandbox;
    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);

    expect(sandbox).to.have.property('fetch');
    expect(sandbox).to.have.property('require');
    expect(sandbox).to.have.property('importScripts');
    expect(sandbox).to.have.property('XMLHttpRequest');

    vm.runInContext(code, sandbox, { filename: 'worker.js' });

    expect(sandbox).to.not.have.property('fetch');
    expect(sandbox).to.not.have.property('require');
    expect(sandbox).to.not.have.property('importScripts');
    expect(sandbox).to.not.have.property('XMLHttpRequest');

    expect(typeof sandbox.onmessage).to.equal('function');

    const stillHasProtoAccessor = vm.runInContext(
      `Object.prototype.hasOwnProperty('__proto__')`,
      sandbox,
    );
    expect(stillHasProtoAccessor).to.equal(false);

    // It should not modify the default object proto
    expect(Object.prototype).to.have.property('__proto__');
  });

  describe('execution timeout', function () {
    const initialWorkerScriptUrl = process.env.TEST_WORKER_SCRIPT_URL;

    beforeEach(function () {
      terminateWorker();
      process.env.TEST_WORKER_SCRIPT_URL = '../test/fixtures/slow-worker.mjs';
    });

    afterEach(function () {
      terminateWorker();
      if (initialWorkerScriptUrl) {
        process.env.TEST_WORKER_SCRIPT_URL = initialWorkerScriptUrl;
      } else {
        delete process.env.TEST_WORKER_SCRIPT_URL;
      }
    });

    it('rejects a request whose worker thread is wedged past the timeout', async function () {
      try {
        await callWorker([1000], { executionTimeoutMs: 500 });
        expect.fail('Expected callWorker to throw an error due to timeout');
      } catch (err) {
        expect((err as Error)?.message).to.equal(
          'Worker execution timed out after 500ms',
        );
      }
    });

    it('spins up a fresh worker for the next call after a timeout kill', async function () {
      await callWorker([1000]).catch(() => {}); // timeouts out
      const result = await callWorker([0]);
      expect(result).to.equal('done');
    });
  });
});
