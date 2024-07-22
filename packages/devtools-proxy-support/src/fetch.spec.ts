import { expect } from 'chai';
import { createFetch } from './';
import { HTTPServerProxyTestSetup } from '../test/helpers';

describe('createFetch', function () {
  it(`consistency check: plain "import('node-fetch') fails"`, async function () {
    let failed = false;
    try {
      await import('node-fetch');
    } catch (error) {
      failed = true;
      expect((error as Error).message).to.include('require() of ES Module');
    }
    expect(failed).to.equal(true);
  });

  context('HTTP calls', function () {
    let setup: HTTPServerProxyTestSetup;

    before(async function () {
      setup = new HTTPServerProxyTestSetup();
      await setup.listen();
    });

    after(async function () {
      await setup.teardown();
    });

    it('provides a node-fetch-like HTTP functionality', async function () {
      const response = await createFetch({})(
        `http://127.0.0.1:${setup.httpServerPort}/test`
      );
      expect(await response.text()).to.equal('OK /test');
    });

    it.only('makes use of proxy support when instructed to do so', async function () {
      const response = await createFetch({
        proxy: `ssh://someuser@127.0.0.1:${setup.sshProxyPort}`,
      })(`http://127.0.0.1:${setup.httpServerPort}/test`);
      expect(await response.text()).to.equal('OK /test');
      expect(setup.sshTunnelInfos).to.deep.equal([]);
    });
  });
});
