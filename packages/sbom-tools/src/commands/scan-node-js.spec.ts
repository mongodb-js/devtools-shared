import { expect } from 'chai';

import { scanNodeJs } from './scan-node-js';

import nock from 'nock';
import { importFixture } from '../../test/helpers';

async function mockCVEResponse(
  cveId: string,
  statusCode = 200,
  response?: any
) {
  nock('https://services.nvd.nist.gov')
    .get('/rest/json/cves/2.0')
    .query({ cveId })
    .reply(statusCode, response ?? (await importFixture(`${cveId}.json`)));
}

describe('scan-node-js', function () {
  beforeEach(async function () {
    nock('https://raw.githubusercontent.com')
      .get('/nodejs/Release/master/schedule.json')
      .reply(200, await importFixture('nodejs-schedule.json'));

    nock('https://nodejs.org')
      .get('/dist/index.json')
      .reply(200, await importFixture('node-dist.json'));

    nock('https://raw.githubusercontent.com')
      .get('/nodejs/security-wg/main/vuln/core/index.json')
      .reply(200, await importFixture('security-wg-index.json'));

    // All CVEs from the Node.js 18.14.0 version. If you change the version that
    // this test is testing against, you'll need to update the CVE snapshots
    for (const cveId of [
      'CVE-2023-23918',
      'CVE-2023-23919',
      'CVE-2023-23936',
      'CVE-2023-24807',
      // This one is overriden in the test itself so that we can provide
      // different responses
      // 'CVE-2023-23920',
    ]) {
      await mockCVEResponse(cveId);
    }
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('report vulnerabilities for a version of node.js', async function () {
    await mockCVEResponse('CVE-2023-23920');

    const result = await scanNodeJs({ version: '18.14.0' });
    expect(result).to.deep.equal(await importFixture('expect-ok.json'));
  });

  it('sets the severity to unknown if fetch from nist fails', async function () {
    await mockCVEResponse('CVE-2023-23920', 500, 'Server error');

    const result = await scanNodeJs({ version: '18.14.0' });

    expect(JSON.parse(JSON.stringify(result, null, 2))).to.deep.equal(
      await importFixture('expect-unknown.json')
    );
  });
});
