import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import * as systemCaModule from 'system-ca';
import {
  findInvalidCertsWithValidDuplicate,
  resetSystemCACache,
  splitPEMBundle,
  systemCA,
} from './system-ca';

// Same subject and same key, different validity periods, like a CA that was
// renewed without rotating its key (COMPASS-9694).
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
// Same subject as the ones above, but a different key
const EXPIRED_OTHER_KEY = `-----BEGIN CERTIFICATE-----
MIIBdzCCAR6gAwIBAgIUNeTa2PChEv1ruxRD2S8/+SaTZWcwCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMB4XDTE5MDEwMTAwMDAwMFoXDTIy
MDgxOTAwMDAwMFowGjEYMBYGA1UEAwwPUmVuZXdlZCBUZXN0IENBMFkwEwYHKoZI
zj0CAQYIKoZIzj0DAQcDQgAEoIzR+nWh3TEEPaeLmPCDoRxCZrwkicd42+2eK+td
OkFphqgAKl+U+YDUnhFCKp+1fw3txhoxxUqPJS6eQs/GH6NCMEAwDwYDVR0TAQH/
BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFKDwRAyXP39VQaWnDu7p
KbUXRUJXMAoGCCqGSM49BAMCA0cAMEQCIERLFMW+0sJqw2KNqX7wyImk7W/NOAnB
qqRW8CxD/AYLAiBNgIkCfKpAiE5mBtRaghfmPx22BsXQaSpkkKhvEBkP3g==
-----END CERTIFICATE-----`;
// Different subject and key
const OTHER_VALID = `-----BEGIN CERTIFICATE-----
MIIBdTCCARygAwIBAgIUYeDp5KhEgGgU3iEKBZ3GB97nsgkwCgYIKoZIzj0EAwIw
GDEWMBQGA1UEAwwNT3RoZXIgVGVzdCBDQTAgFw0yMDAxMDEwMDAwMDBaGA8yMTI2
MDEwMTAwMDAwMFowGDEWMBQGA1UEAwwNT3RoZXIgVGVzdCBDQTBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABLwUyygo/kxxs5VZwdYiTdI2zUYIPfDNB248cdAua4qH
FYkSTainMdtmPmztXC2QaOuZS9aDVO2PHcgz+oiF6DajQjBAMA8GA1UdEwEB/wQF
MAMBAf8wDgYDVR0PAQH/BAQDAgEGMB0GA1UdDgQWBBREabjC+Gs9jCg6dVsFPGr6
0EkvfjAKBggqhkjOPQQDAgNHADBEAiBO4xZhiiEYKzqfpOJr7fa3VVyfzVhpuXRZ
smur0y4XrwIgVlESYShnG23EulyMEt9cpQqDmfpSXQzb4A5GYHYvnBg=
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

    it('returns an empty list when there is no certificate', function () {
      expect(splitPEMBundle('')).to.deep.equal([]);
      expect(splitPEMBundle('not a certificate')).to.deep.equal([]);
    });
  });

  describe('findInvalidCertsWithValidDuplicate', function () {
    it('finds an expired cert that has a valid duplicate, in any order', function () {
      for (const bundle of [
        [EXPIRED, VALID],
        [VALID, EXPIRED],
        [EXPIRED, OTHER_VALID, VALID],
        [OTHER_VALID, VALID, EXPIRED],
      ]) {
        expect(findInvalidCertsWithValidDuplicate(bundle).pems).to.deep.equal([
          EXPIRED,
        ]);
      }
    });

    it('finds a not yet valid cert that has a valid duplicate', function () {
      expect(
        findInvalidCertsWithValidDuplicate([NOT_YET_VALID, VALID]).pems,
      ).to.deep.equal([NOT_YET_VALID]);
    });

    it('ignores an expired cert that has no valid duplicate', function () {
      const result = findInvalidCertsWithValidDuplicate([EXPIRED, OTHER_VALID]);
      expect(result.pems).to.deep.equal([]);
      expect(result.messages).to.deep.equal([]);
    });

    it('ignores an expired cert whose valid counterpart has a different key', function () {
      expect(
        findInvalidCertsWithValidDuplicate([EXPIRED_OTHER_KEY, VALID]).pems,
      ).to.deep.equal([]);
    });

    it('ignores certs when all of them are valid', function () {
      expect(
        findInvalidCertsWithValidDuplicate([OTHER_VALID, VALID]).pems,
      ).to.deep.equal([]);
    });

    it('evaluates validity at the given point in time', function () {
      const bundle = [EXPIRED, VALID];
      const beforeRenewal = new Date('2019-06-01').getTime();
      expect(
        findInvalidCertsWithValidDuplicate(bundle, beforeRenewal).pems,
      ).to.deep.equal([VALID]);
      const afterValidEnd = new Date('2127-01-01').getTime();
      expect(
        findInvalidCertsWithValidDuplicate(bundle, afterValidEnd).pems,
      ).to.deep.equal([]);
    });

    it('ignores certs that cannot be parsed', function () {
      const garbage =
        '-----BEGIN CERTIFICATE-----\nnot a certificate\n-----END CERTIFICATE-----';
      expect(
        findInvalidCertsWithValidDuplicate([EXPIRED, garbage, VALID]).pems,
      ).to.deep.equal([EXPIRED]);
    });

    it('reports a repeated cert only once', function () {
      const result = findInvalidCertsWithValidDuplicate([
        EXPIRED,
        VALID,
        EXPIRED,
      ]);
      expect(result.pems).to.deep.equal([EXPIRED]);
      expect(result.messages).to.have.lengthOf(1);
    });

    it('explains why a certificate is reported', function () {
      const { messages } = findInvalidCertsWithValidDuplicate([EXPIRED, VALID]);
      expect(messages).to.have.lengthOf(1);
      expect(messages[0]).to.include('CN=Renewed Test CA');
      expect(messages[0]).to.include('2022');
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

    it('removes an expired system cert that has a valid duplicate and says so in messages', async function () {
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

    it('matches duplicates across the system store and the ca option', async function () {
      stubSystemCerts([EXPIRED]);
      const { ca } = await systemCA({ ca: VALID });
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
    });

    it('matches duplicates across the ca option and tlsCAFile', async function () {
      const tlsCAFile = path.join(dir, 'ca.pem');
      await fs.writeFile(tlsCAFile, VALID);
      const { ca } = await systemCA({
        ca: EXPIRED,
        tlsCAFile,
        excludeSystemCerts: true,
      });
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
    });

    it('keeps everything else in the bundle, like comments', async function () {
      const { ca } = await systemCA({
        ca: `# corporate CAs\n${EXPIRED}\n${VALID}`,
        excludeSystemCerts: true,
      });
      expect(ca).to.include('# corporate CAs');
      expect(ca).to.include(VALID);
      expect(ca).to.not.include(EXPIRED);
    });

    it('leaves the bundle as it is when there is nothing to remove', async function () {
      const bundle = `# corporate CAs\n${OTHER_VALID}`;
      const { ca, messages } = await systemCA({
        ca: bundle,
        excludeSystemCerts: true,
      });
      expect(ca).to.include(bundle);
      expect(messages).to.deep.equal([]);
    });
  });
});
