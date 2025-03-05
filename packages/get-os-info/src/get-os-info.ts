import os from 'os';
import { promises as fs } from 'fs';

type LinuxInfo = {
  os_linux_dist: string;
  os_linux_release: string;
};

type OsInfo = {
  os_type: string;
  os_version: string;
  os_arch: string;
  os_release: string;
} & Partial<LinuxInfo>;

async function getLinuxInfo(): Promise<LinuxInfo> {
  try {
    const releaseFile = '/etc/os-release';
    const etcRelease = await fs.readFile(releaseFile, 'utf-8');
    return parseLinuxInfo(etcRelease);
  } catch (e) {
    return {
      os_linux_dist: 'unknown',
      os_linux_release: 'unknown',
    };
  }
}

export function parseLinuxInfo(etcRelease: string): LinuxInfo {
  const osReleaseEntries = etcRelease
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('='))
    .map(([k, v]) => [k, (v || '').replace(/^["']/, '').replace(/["']$/, '')]);

  const osReleaseKv = Object.fromEntries(osReleaseEntries);

  return {
    os_linux_dist: osReleaseKv.ID || 'unknown',
    os_linux_release: osReleaseKv.VERSION_ID || 'unknown',
  };
}

export async function getOsInfo(): Promise<OsInfo> {
  return {
    os_type: os.type(),
    os_version: os.version(),
    os_arch: os.arch(),
    os_release: os.release(),
    ...(process.platform === 'linux' ? await getLinuxInfo() : {}),
  };
}
