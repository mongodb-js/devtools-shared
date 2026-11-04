import { expect } from 'chai';
import { promises as fs } from 'fs';
import { X509Certificate } from 'crypto';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import * as systemCaModule from 'system-ca';
import {
  findInvalidCerts,
  resetSystemCACache,
  splitPEMBundle,
  systemCA,
} from './system-ca';

// The same CA renewed without rotating its key (COMPASS-9694): valid until
// 2126, expired in 2022, and valid only from 2100.
const VALID = `-----BEGIN CERTIFICATE-----
MIIBejCCASCgAwIBAgIUW9vkAYO0f4olopG3SbYN7CKPlKIwCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMCAXDTIwMDEwMTAwMDAwMFoYDzIx
MjYwMTAxMDAwMDAwWjAaMRgwFgYDVQQDDA9SZW5ld2VkIFRlc3QgQ0EwWTATBgcq
hkjOPQIBBggqhkjOPQMBBwNCAARZwUKfiieajA81hF0LZ1MkkIgzmNEurlCNLonp
5/oYLH4EJ1mX6IhMBOEyukkowoPwLK5Ltmoe+JZzTLNxOEw5o0IwQDAPBgNVHRMB
Af8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAdBgNVHQ4EFgQU2DYkuE75z2Li3Soj
DezvsfPtrDAwCgYIKoZIzj0EAwIDSAAwRQIgfTZ+/xmeJ7KIh/Vss7uk3xC1GNzi
1Q+KTm9tSz9OPBMCIQC5zCupUapeaGB0gAAYVrvzT2GZIvvOAGR7S9vJ1tltXQ==
-----END CERTIFICATE-----`;
const EXPIRED = `-----BEGIN CERTIFICATE-----
MIIBdzCCAR6gAwIBAgIUOM2ihSEQ2AYQ1oidXjZTgJl6KMIwCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMB4XDTE5MDEwMTAwMDAwMFoXDTIy
MDgxOTAwMDAwMFowGjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMFkwEwYHKoZI
zj0CAQYIKoZIzj0DAQcDQgAEWcFCn4onmowPNYRdC2dTJJCIM5jRLq5QjS6J6ef6
GCx+BCdZl+iITAThMrpJKMKD8CyuS7ZqHviWc0yzcThMOaNCMEAwDwYDVR0TAQH/
BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFNg2JLhO+c9i4t0qIw3s
77Hz7awwMAoGCCqGSM49BAMCA0cAMEQCIGM0xNXYeLGRtLiSLWf3316m449u86bq
bgKvOHKtEHZdAiAnFUUCncltrc8hi3qglI85C+xYPjbbM/eEyvPFTM/q9w==
-----END CERTIFICATE-----`;
const NOT_YET_VALID = `-----BEGIN CERTIFICATE-----
MIIBfDCCASKgAwIBAgIUUQYvvxN3C/VsqGOlcCoFuFkTZqowCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMCIYDzIxMDAwMTAxMDAwMDAwWhgP
MjE1MDAxMDEwMDAwMDBaMBoxGDAWBgNVBAMMD1JlbmV3ZWQgVGVzdCBDQTBZMBMG
ByqGSM49AgEGCCqGSM49AwEHA0IABFnBQp+KJ5qMDzWEXQtnUySQiDOY0S6uUI0u
ienn+hgsfgQnWZfoiEwE4TK6SSjCg/Asrku2ah74lnNMs3E4TDmjQjBAMA8GA1Ud
EwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMB0GA1UdDgQWBBTYNiS4TvnPYuLd
KiMN7O+x8+2sMDAKBggqhkjOPQQDAgNIADBFAiEAjscJxI0DaoFrytgGTYZxbIh8
1UA39K/CHaZ1vkhjr/4CIHR6MGSHKkascqMkduuNL/Y94T8a11zoxcjac3+h/cxe
-----END CERTIFICATE-----`;

describe('system-ca', function () {
  describe('splitPEMBundle', function () {
    it('splits a bundle into certificates and ignores the text around them', function () {
      const bundle = `# first\n${VALID}\nsubject=something\n${EXPIRED}\ntrailing`;
      expect(splitPEMBundle(bundle)).to.deep.equal([VALID, EXPIRED]);
    });

    it('ignores other kinds of PEM blocks', function () {
      const key = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
      expect(splitPEMBundle(`${key}\n${VALID}`)).to.deep.equal([VALID]);
    });

    it('does not complete a certificate that has no END marker', function () {
      const truncated = VALID.replace('-----END CERTIFICATE-----', '');
      expect(splitPEMBundle(`${EXPIRED}\n${truncated}`)).to.deep.equal([
        EXPIRED,
      ]);
    });

    it('returns an empty list when there is no certificate', function () {
      expect(splitPEMBundle('')).to.deep.equal([]);
      expect(splitPEMBundle('not a certificate')).to.deep.equal([]);
    });
  });

  describe('findInvalidCerts', function () {
    it('finds an expired cert, wherever it is in the list', function () {
      expect(findInvalidCerts([EXPIRED, VALID]).pems).to.deep.equal([EXPIRED]);
      expect(findInvalidCerts([VALID, EXPIRED]).pems).to.deep.equal([EXPIRED]);
    });

    it('finds a not yet valid cert', function () {
      expect(findInvalidCerts([NOT_YET_VALID, VALID]).pems).to.deep.equal([
        NOT_YET_VALID,
      ]);
    });

    it('finds nothing when all certs are valid', function () {
      const result = findInvalidCerts([VALID]);
      expect(result.pems).to.deep.equal([]);
      expect(result.messages).to.deep.equal([]);
    });

    it('evaluates validity at the given point in time', function () {
      const bundle = [EXPIRED, VALID];
      const beforeRenewal = new Date('2019-06-01').getTime();
      expect(findInvalidCerts(bundle, beforeRenewal).pems).to.deep.equal([
        VALID,
      ]);
      const afterValidEnd = new Date('2127-01-01').getTime();
      expect(findInvalidCerts(bundle, afterValidEnd).pems).to.deep.equal([
        EXPIRED,
        VALID,
      ]);
    });

    it('ignores certs that cannot be parsed', function () {
      const garbage =
        '-----BEGIN CERTIFICATE-----\nnot a certificate\n-----END CERTIFICATE-----';
      expect(findInvalidCerts([EXPIRED, garbage, VALID]).pems).to.deep.equal([
        EXPIRED,
      ]);
    });

    it('reports a repeated cert only once', function () {
      const result = findInvalidCerts([EXPIRED, VALID, EXPIRED]);
      expect(result.pems).to.deep.equal([EXPIRED]);
      expect(result.messages).to.have.lengthOf(1);
    });

    it('explains why a certificate is reported', function () {
      const expired = findInvalidCerts([EXPIRED]).messages[0];
      expect(expired).to.include('expired');
      expect(expired).to.include('CN=Renewed Test CA');
      expect(expired).to.include('2022');
      expect(findInvalidCerts([NOT_YET_VALID]).messages[0]).to.include(
        'not yet valid',
      );
    });
  });

  describe('systemCA', function () {
    let dir: string;

    beforeEach(async function () {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-ca-spec-'));
    });

    afterEach(async function () {
      sinon.restore();
      resetSystemCACache();
      await fs.rm(dir, { recursive: true, force: true });
    });

    function stubSystemCerts(certs: string[]) {
      sinon.stub(systemCaModule, 'systemCertsAsync').resolves(certs);
      resetSystemCACache();
    }

    it('removes an expired system cert and says so in messages', async function () {
      stubSystemCerts([EXPIRED, VALID]);
      const { ca, messages } = await systemCA();
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
      expect(messages).to.have.lengthOf(1);
    });

    it('removes an expired cert passed in the ca option', async function () {
      const { ca } = await systemCA({
        ca: [EXPIRED, VALID],
        excludeSystemCerts: true,
      });
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
    });

    it('removes an expired cert read from tlsCAFile', async function () {
      const tlsCAFile = path.join(dir, 'ca.pem');
      await fs.writeFile(tlsCAFile, `${EXPIRED}\n${VALID}`);
      const { ca } = await systemCA({ tlsCAFile, excludeSystemCerts: true });
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
    });

    it('keeps everything else in the bundle, like comments', async function () {
      const { ca } = await systemCA({
        ca: `# corporate CAs\n${EXPIRED}\n# second\n${VALID}\n${NOT_YET_VALID}\ntrailing`,
        excludeSystemCerts: true,
      });
      expect(ca).to.include('# corporate CAs');
      expect(ca).to.include('# second');
      expect(ca).to.include('trailing');
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
      expect(ca).to.not.include(NOT_YET_VALID);
    });

    it('uses the bundle as it is if removing certificates fails', async function () {
      sinon.stub(X509Certificate.prototype, 'serialNumber').get(() => {
        throw new Error('boom');
      });
      const { ca, messages } = await systemCA({
        ca: [EXPIRED, VALID],
        excludeSystemCerts: true,
      });
      expect(ca).to.include(EXPIRED);
      expect(ca).to.include(VALID);
      expect(messages).to.have.lengthOf(1);
      expect(messages[0]).to.include('Unable to remove invalid certificates');
      expect(messages[0]).to.include('boom');
    });

    it('leaves the bundle as it is when there is nothing to remove', async function () {
      const bundle = `# corporate CAs\n${VALID}`;
      const { ca, messages } = await systemCA({
        ca: bundle,
        excludeSystemCerts: true,
      });
      expect(ca).to.include(bundle);
      expect(messages).to.deep.equal([]);
    });
  });
});
