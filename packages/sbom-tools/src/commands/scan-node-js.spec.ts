import { expect } from 'chai';

import { scanNodeJs } from './scan-node-js';

import nock from 'nock';
import { importFixture } from '../../test/helpers';

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

    nock('https://services.nvd.nist.gov')
      .get('/rest/json/cves/2.0')
      .query({ cveId: 'CVE-2022-32214' })
      .reply(200, await importFixture('CVE-2022-32214.json'));

    nock('https://services.nvd.nist.gov')
      .get('/rest/json/cves/2.0')
      .query({ cveId: 'CVE-2022-32223' })
      .reply(200, await importFixture('CVE-2022-32223.json'));
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('report vulnerabilities for a version of node.js', async function () {
    nock('https://services.nvd.nist.gov')
      .get('/rest/json/cves/2.0')
      .query({ cveId: 'CVE-2022-32222' })
      .reply(200, await importFixture('CVE-2022-32222.json'));

    const result = await scanNodeJs({ version: '16.19.1' });
    expect(result).to.deep.equal(await importFixture('expect-ok.json'));
  });

  it('sets the severity to unknown if fetch from nist fails', async function () {
    nock('https://services.nvd.nist.gov')
      .get('/rest/json/cves/2.0')
      .query({ cveId: 'CVE-2022-32222' })
      .reply(500, 'Server error');

    const result = await scanNodeJs({ version: '16.19.1' });

    expect(JSON.parse(JSON.stringify(result, null, 2))).to.deep.equal(
      await importFixture('expect-unknown.json')
    );
  });
});
