import { expect } from 'chai';
import sinon from 'sinon';
import vm from 'vm';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Worker as NodeWorker } from 'worker_threads';

import * as api from './index.js';
import {
  terminateWorker,
  callWorker,
  getExecutionTimeoutMs,
  setWorkerSource,
} from './worker-client.js';
import {
  restrictGlobalScope,
  restrictObjectPrototype,
  ALLOWED_GLOBALS,
  DISALLOWED_PROTOTYPE_PROPS,
} from './worker.js';
import { PARSE_TEST_CASES } from './../test/parse-test-cases.js';

const specDir = path.dirname(fileURLToPath(import.meta.url));

describe('shell-bson-parser with webworker processing', function () {
  let workerBundle: string;

  before(async function () {
    // Specs run from src, where worker-source.ts is an empty placeholder.
    workerBundle = await fs.readFile(
      path.join(specDir, '..', 'dist', 'worker.js'),
      'utf8',
    );
    setWorkerSource(workerBundle);
  });

  after(function () {
    setWorkerSource(null);
    terminateWorker();
  });

  it('inlines the bundled worker into dist/worker-source.js', async function () {
    const { default: inlined } = await import(
      pathToFileURL(path.join(specDir, '..', 'dist', 'worker-source.js')).href
    );
    expect(inlined).to.equal(workerBundle);
  });

  it('rejects when the worker source is missing', async function () {
    terminateWorker();
    setWorkerSource('');
    try {
      await api.parse('{ a: 1 }');
      expect.fail('Expected parse to throw');
    } catch (err) {
      expect((err as Error).message).to.match(/worker source is missing/);
    } finally {
      setWorkerSource(workerBundle);
    }
  });

  it('keeps the error type and properties of a failed parse', async function () {
    try {
      await api.parse('{ a: }');
      expect.fail('Expected parse to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(SyntaxError);
      expect((err as Error).name).to.equal('SyntaxError');
      expect(err).to.deep.include({
        pos: 7,
        raisedAt: 8,
        loc: { line: 2, column: 5 },
      });
    }
  });

  describe('parse', function () {
    for (const { title, input, options, expected } of PARSE_TEST_CASES) {
      it(title, async function () {
        const res = await api.parse(input, options);
        expect(res).to.deep.equal(expected);
      });
    }

    it('keeps the error type of a failed parse', async function () {
      try {
        await api.parse('{ a: }');
        expect.fail('Expected parse to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(SyntaxError);
        expect((err as Error).name).to.equal('SyntaxError');
      }
    });
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
      expect(scope).to.not.have.property('process');
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
      terminateSpy = sinon.spy(NodeWorker.prototype, 'terminate');
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

  describe('worker lifecycle', function () {
    afterEach(function () {
      terminateWorker();
      setWorkerSource(workerBundle);
    });

    it('rejects pending requests right away when the worker thread exits', async function () {
      terminateWorker();
      setWorkerSource('process.exit(3)');
      try {
        await callWorker([1]);
        expect.fail('Expected callWorker to throw');
      } catch (err) {
        expect((err as Error).message).to.equal('Worker exited with code 3');
      }
    });

    it('does not let the exit of a terminated worker kill its replacement', async function () {
      await api.parse('{ a: 1 }');
      terminateWorker();
      // The old thread's 'exit' event lands while the new request is pending
      const res = await api.parse('{ b: 2 }');
      expect(res).to.deep.equal({ b: 2 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await api.parse('{ c: 3 }')).to.deep.equal({ c: 3 });
    });
  });

  describe('browser worker', function () {
    type Listener = (event: unknown) => void;

    class FakeWorker {
      static instances: FakeWorker[] = [];
      listeners = new Map<string, Listener>();
      terminated = false;
      constructor(public url: string) {
        FakeWorker.instances.push(this);
      }
      addEventListener(type: string, fn: Listener) {
        this.listeners.set(type, fn);
      }
      postMessage(message: { id: number }) {
        const respond = this.listeners.get('message');
        setTimeout(() =>
          respond?.({
            data: {
              id: message.id,
              ok: true,
              result: { data: 'from-browser', bsonTypes: new Map() },
            },
          }),
        );
      }
      terminate() {
        this.terminated = true;
      }
    }

    let createObjectURL: sinon.SinonStub;
    let revokeObjectURL: sinon.SinonStub;

    beforeEach(function () {
      terminateWorker();
      FakeWorker.instances = [];
      (globalThis as { Worker?: unknown }).Worker = FakeWorker;
      createObjectURL = sinon
        .stub(globalThis.URL, 'createObjectURL')
        .returns('blob:fake');
      revokeObjectURL = sinon.stub(globalThis.URL, 'revokeObjectURL');
    });

    afterEach(function () {
      terminateWorker();
      delete (globalThis as { Worker?: unknown }).Worker;
      createObjectURL.restore();
      revokeObjectURL.restore();
    });

    it('starts the worker from a blob URL and revokes it on terminate', async function () {
      expect(await callWorker(['x'])).to.equal('from-browser');
      expect(FakeWorker.instances).to.have.length(1);
      expect(FakeWorker.instances[0].url).to.equal('blob:fake');
      const blob = createObjectURL.firstCall.args[0] as Blob;
      expect(await blob.text()).to.equal(workerBundle);
      expect(revokeObjectURL.called).to.equal(false);

      terminateWorker();
      expect(FakeWorker.instances[0].terminated).to.equal(true);
      expect(revokeObjectURL.calledOnceWith('blob:fake')).to.equal(true);
    });

    it('rejects pending requests on a worker error event', async function () {
      sinon.stub(FakeWorker.prototype, 'postMessage').callsFake(function (
        this: FakeWorker,
      ) {
        // Never responds; fails with an error event instead
        setTimeout(() => this.listeners.get('error')?.({ message: 'boom' }));
      });
      try {
        await callWorker(['x']);
        expect.fail('Expected callWorker to throw');
      } catch (err) {
        expect((err as Error).message).to.equal('boom');
      } finally {
        (FakeWorker.prototype.postMessage as sinon.SinonStub).restore();
      }
      expect(FakeWorker.instances[0].terminated).to.equal(true);
    });
  });

  it('strips dangerous globals and locks down Object.prototype when the real worker starts', function () {
    const code = workerBundle;

    const sandbox: Record<string, unknown> = Object.create(null);
    let messageHandler: ((event: MessageEvent) => void) | undefined;
    let response: any;
    sandbox.postMessage = function postMessage(value: unknown) {
      expect(this).to.equal(workerScope);
      response = value;
    };
    sandbox.addEventListener = function addEventListener(
      name: string,
      handler: (event: MessageEvent) => void,
    ) {
      expect(name).to.equal('message');
      messageHandler = handler;
    };
    sandbox.onmessage = null;
    sandbox.fetch = function fetch() {};
    sandbox.require = function require() {};
    sandbox.importScripts = function importScripts() {};
    sandbox.XMLHttpRequest = function XMLHttpRequest() {};
    sandbox.self = sandbox;
    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);
    const workerScope = vm.runInContext('globalThis', sandbox);

    expect(sandbox).to.have.property('fetch');
    expect(sandbox).to.have.property('require');
    expect(sandbox).to.have.property('importScripts');
    expect(sandbox).to.have.property('XMLHttpRequest');

    vm.runInContext(code, sandbox, { filename: 'worker.js' });

    expect(sandbox).to.not.have.property('fetch');
    expect(sandbox).to.not.have.property('require');
    expect(sandbox).to.not.have.property('importScripts');
    expect(sandbox).to.not.have.property('XMLHttpRequest');

    expect(sandbox).to.not.have.property('onmessage');
    expect(messageHandler).to.be.a('function');
    messageHandler!({
      data: { id: 7, args: { data: ['{ a: 1 }'], bsonTypes: new Map() } },
    } as MessageEvent);
    expect(response).to.include({ id: 7, ok: true });
    expect(response.result.data).to.deep.equal({ a: 1 });

    const stillHasProtoAccessor = vm.runInContext(
      `Object.prototype.hasOwnProperty('__proto__')`,
      sandbox,
    );
    expect(stillHasProtoAccessor).to.equal(false);

    // It should not modify the default object proto
    expect(Object.prototype).to.have.property('__proto__');
  });

  describe('execution timeout', function () {
    beforeEach(async function () {
      terminateWorker();
      setWorkerSource(
        await fs.readFile(
          path.join(specDir, '..', 'test', 'fixtures', 'slow-worker.js'),
          'utf8',
        ),
      );
    });

    afterEach(function () {
      terminateWorker();
      setWorkerSource(workerBundle);
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
      await callWorker([1000]).catch(() => {}); // times out
      const result = await callWorker([0]);
      expect(result).to.equal('done');
    });
  });

  describe('getExecutionTimeoutMs', function () {
    it('returns the default timeout if 0 is specified', function () {
      expect(getExecutionTimeoutMs(0)).to.equal(5_000);
    });

    it('returns the default timeout if a negative value is specified', function () {
      expect(getExecutionTimeoutMs(-100)).to.equal(5_000);
    });

    it('returns the specified timeout if it is positive', function () {
      expect(getExecutionTimeoutMs(2000)).to.equal(2000);
    });
  });
});
