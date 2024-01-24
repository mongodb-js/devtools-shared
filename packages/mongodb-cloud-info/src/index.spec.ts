import { getCloudInfo } from '.';
import chai from 'chai';
import nock from 'nock';
import path from 'path';

const expect = chai.expect;

describe('getCloudInfo', function () {
  beforeEach(function () {
    nock('https://raw.githubusercontent.com', {
      reqheaders: {
        accept: '*/*',
        'user-agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        'accept-encoding': 'gzip,deflate',
      },
    })
      .get('/mongodb-js/devtools-shared/main/resources/cidrs.json')
      .replyWithFile(
        200,
        path.resolve(__dirname, '../../../resources/cidrs.json')
      );
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('returns all false for undefined', async function () {
    const cloudInfo = await getCloudInfo();
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false,
    });
  });

  it('returns all false for localhost', async function () {
    const cloudInfo = await getCloudInfo('localhost');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false,
    });
  });

  it('works with local ip address (127.0.0.1)', async function () {
    const cloudInfo = await getCloudInfo('127.0.0.1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false,
    });
  });

  it('works with local ipv6 address (::1)', async function () {
    const cloudInfo = await getCloudInfo('::1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false,
    });
  });

  it('returns {isAws: true} if hostname is an AWS ip', async function () {
    const cloudInfo = await getCloudInfo('13.248.118.1');
    expect(cloudInfo).to.deep.equal({
      isAws: true,
      isGcp: false,
      isAzure: false,
    });
  });

  it('returns {isGcp: true} if hostname is a GCP ip', async function () {
    const cloudInfo = await getCloudInfo('8.34.208.1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: true,
      isAzure: false,
    });
  });

  it('returns {isAzure: true} if hostname is an Azure ip', async function () {
    const cloudInfo = await getCloudInfo('13.64.151.161');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: true,
    });
  });
}).timeout(5000);
