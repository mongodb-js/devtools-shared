import { expect } from 'chai';
import os from 'os';
import { promises as fs } from 'fs';

import { getOsInfo, parseDarwinInfo, parseLinuxInfo } from './get-os-info';

describe('get-os-info', function () {
  it('returns info from "os" module', async function () {
    const { os_arch, os_type, os_version, os_release } = await getOsInfo();
    expect({ os_arch, os_type, os_version, os_release }).to.deep.equal({
      os_arch: os.arch(),
      os_type: os.type(),
      os_version: os.version(),
      os_release: os.release(),
    });
  });

  describe('on linux', function () {
    it('parses os-release file', function () {
      // Copied from https://manpages.ubuntu.com/manpages/focal/man5/os-release.5.html#example
      const fixture = `
        NAME=Fedora
        VERSION="17 (Beefy Miracle)"
        ID=fedora
        VERSION_ID=17
        PRETTY_NAME="Fedora 17 (Beefy Miracle)"
        ANSI_COLOR="0;34"
        CPE_NAME="cpe:/o:fedoraproject:fedora:17"
        HOME_URL="https://fedoraproject.org/"
        BUG_REPORT_URL="https://bugzilla.redhat.com/"
      `;

      expect(parseLinuxInfo(fixture)).to.deep.equal({
        os_linux_dist: 'fedora',
        os_linux_release: '17',
      });
    });

    it('returns info from /etc/releases', async function () {
      if (process.platform !== 'linux') {
        this.skip();
      }

      const etcRelease = await fs.readFile('/etc/os-release', 'utf-8');

      const releaseKv = etcRelease
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split('='));

      const distroId = releaseKv
        .find(([k]) => k === 'ID')[1]
        .replace(/["']/g, '');
      const distroVer = releaseKv
        .find(([k]) => k === 'VERSION_ID')[1]
        .replace(/["']/g, '');

      // check that we test against actual values and not just an empty string
      expect(distroId).to.match(/^(rhel|ubuntu|debian)$/);
      expect(distroVer).to.match(/^\d+/);

      const { os_linux_dist, os_linux_release } = await getOsInfo();
      expect({ os_linux_dist, os_linux_release }).to.deep.equal({
        os_linux_dist: distroId,
        os_linux_release: distroVer,
      });
    });
  });
});
