import { expect } from 'chai';

import * as api from './index.js';
import { terminateWorker } from './worker-client.js';
import { handleRequest } from './worker.js';
import type { WorkerRequest } from './worker-types.js';
import { PARSE_TEST_CASES } from './../test/parse-test-cases.js';

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
  const initialSkipWorkerScriptFetch =
    process.env.TEST_SKIP_WORKER_SCRIPT_FETCH;

  before(function () {
    process.env.TEST_SKIP_WORKER_SCRIPT_FETCH = '1';
  });

  after(function () {
    process.env.TEST_SKIP_WORKER_SCRIPT_FETCH = initialSkipWorkerScriptFetch;
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
