import ConnectionString from 'mongodb-connection-string-url';

const ATLAS_REGEX = /\.mongodb(-dev|-qa|-stage)?\.net$/i;
const ATLAS_STREAM_REGEX = /^atlas-stream-.+/i;
const LOCALHOST_REGEX =
  /^(localhost|127\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])|0\.0\.0\.0|(?:0*\:)*?:?0*1)$/i;
const DIGITAL_OCEAN_REGEX = /\.mongo\.ondigitalocean\.com$/i;
const COSMOS_DB_REGEX = /\.cosmos\.azure\.com$/i;
const DOCUMENT_DB_REGEX = /docdb(-elastic)?\.amazonaws\.com$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getDataLake(buildInfo: unknown): {
  isDataLake: boolean;
  dlVersion: string | null;
} {
  if (
    isRecord(buildInfo) &&
    isRecord(buildInfo.dataLake) &&
    typeof buildInfo.dataLake.version === 'string'
  ) {
    return {
      isDataLake: true,
      dlVersion: buildInfo.dataLake.version,
    };
  } else {
    return {
      isDataLake: false,
      dlVersion: null,
    };
  }
}

export function isEnterprise(buildInfo: unknown): boolean {
  if (!isRecord(buildInfo)) {
    return false;
  }

  if (
    typeof buildInfo.gitVersion === 'string' &&
    buildInfo.gitVersion.match(/enterprise/)
  ) {
    return true;
  }

  if (
    Array.isArray(buildInfo.modules) &&
    buildInfo.modules.indexOf('enterprise') !== -1
  ) {
    return true;
  }

  return false;
}

function getHostnameFromHost(host: string): string {
  if (host.startsWith('[')) {
    // If it's ipv6 return what's in the brackets.
    return host.substring(1).split(']')[0];
  }
  return host.split(':')[0];
}

function getHostnameFromUrl(url: unknown): string {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    const connectionString = new ConnectionString(url);
    return getHostnameFromHost(connectionString.hosts[0]);
  } catch (e) {
    // we assume is already an hostname, will further be checked against regexes
    return getHostnameFromHost(url);
  }
}

export function isAtlas(uri: string): boolean {
  return !!getHostnameFromUrl(uri).match(ATLAS_REGEX);
}

type IsLocalAtlasCountFn = (
  db: string,
  ns: string,
  query: Record<string, unknown>,
) => Promise<number>;
export async function isLocalAtlas(
  countFn: IsLocalAtlasCountFn,
): Promise<boolean> {
  try {
    const count = await countFn('admin', 'atlascli', {
      managedClusterType: 'atlasCliLocalDevCluster',
    });
    return count > 0;
  } catch {
    return false;
  }
}
export function isAtlasStream(uri: string): boolean {
  const host = getHostnameFromUrl(uri);
  return !!(host.match(ATLAS_REGEX) && host.match(ATLAS_STREAM_REGEX));
}
export function isLocalhost(uri: string): boolean {
  return !!getHostnameFromUrl(uri).match(LOCALHOST_REGEX);
}
export function isDigitalOcean(uri: string): boolean {
  return !!getHostnameFromUrl(uri).match(DIGITAL_OCEAN_REGEX);
}

export function getGenuineMongoDB(uri: string): {
  isGenuine: boolean;
  serverName: string;
} {
  const hostname = getHostnameFromUrl(uri);
  if (hostname.match(COSMOS_DB_REGEX)) {
    return {
      isGenuine: false,
      serverName: 'cosmosdb',
    };
  }

  if (hostname.match(DOCUMENT_DB_REGEX)) {
    return {
      isGenuine: false,
      serverName: 'documentdb',
    };
  }

  return {
    isGenuine: true,
    serverName: 'mongodb',
  };
}

export function getBuildEnv(buildInfo: unknown): {
  serverOs: string | null;
  serverArch: string | null;
} {
  if (!isRecord(buildInfo) || !isRecord(buildInfo.buildEnvironment)) {
    return { serverOs: null, serverArch: null };
  }

  const { buildEnvironment } = buildInfo;

  return {
    serverOs:
      typeof buildEnvironment.target_os === 'string'
        ? buildEnvironment.target_os
        : null,
    serverArch:
      typeof buildEnvironment.target_arch === 'string'
        ? buildEnvironment.target_arch
        : null,
  };
}
