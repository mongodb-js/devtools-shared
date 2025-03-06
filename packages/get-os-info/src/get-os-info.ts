import os from 'os';
import { promises as fs } from 'fs';

type LinuxInfo = {
  os_linux_dist: string;
  os_linux_release: string;
};

type DarwinInfo = {
  os_darwin_product_name: string;
  os_darwin_product_version: string;
  os_darwin_product_build_version: string;
};

type OsInfo = {
  os_type: string;
  os_version: string;
  os_arch: string;
  os_release: string;
} & Partial<LinuxInfo> &
  Partial<DarwinInfo>;

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

async function getDarwinInfo(): Promise<DarwinInfo> {
  try {
    const systemVersionPlistPath =
      '/System/Library/CoreServices/SystemVersion.plist';
    const systemVersionPlist = await fs.readFile(
      systemVersionPlistPath,
      'utf-8'
    );
    return parseDarwinInfo(systemVersionPlist);
  } catch (e) {
    return {
      os_darwin_product_name: 'unknown',
      os_darwin_product_version: 'unknown',
      os_darwin_product_build_version: 'unknown',
    };
  }
}

export function parseDarwinInfo(systemVersionPlist: string): DarwinInfo {
  const match = systemVersionPlist.matchAll(
    /<key>(?<key>[^<]+)<\/key>\s*<string>(?<value>[^<]+)<\/string>/gm
  );

  const {
    ProductName: os_darwin_product_name = 'unknown',
    ProductVersion: os_darwin_product_version = 'unknown',
    ProductBuildVersion: os_darwin_product_build_version = 'unknown',
  } = Object.fromEntries(
    Array.from(match).map((m) => [m.groups?.key, m.groups?.value])
  );

  return {
    os_darwin_product_name,
    os_darwin_product_version,
    os_darwin_product_build_version,
  };
}

export async function getOsInfo(): Promise<OsInfo> {
  return {
    os_type: os.type(),
    os_version: os.version(),
    os_arch: os.arch(),
    os_release: os.release(),
    ...(process.platform === 'linux' ? await getLinuxInfo() : {}),
    ...(process.platform === 'darwin' ? await getDarwinInfo() : {}),
  };
}
