import { expect } from 'chai';

import * as api from './index.js';
import { terminateWorker } from './worker-client.js';
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

  it('keeps the error type of a failed parse', async function () {
    try {
      await api.parse('{ a: }');
      expect.fail('Expected parse to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(SyntaxError);
      expect((err as Error).name).to.equal('SyntaxError');
    }
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
