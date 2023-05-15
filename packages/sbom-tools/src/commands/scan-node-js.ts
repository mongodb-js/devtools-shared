import fetch from 'node-fetch';
import semver from 'semver';
import nv from '@pkgjs/nv';

type NodeVuln = {
  cve: string[];
  vulnerable: string;
  patched: string;
  reported_by: string;
  ref: string;
  overview: string;
  affectedEnvironments: string[];
};

type Severity = 'low' | 'medium' | 'high' | 'critical';

function scoreToSeverity(score: number): Severity {
  if (score >= 9) {
    return 'critical';
  }
  if (score >= 7) {
    return 'high';
  }
  if (score >= 4) {
    return 'medium';
  }
  return 'low';
}

async function formatVuln(
  id: string,
  nodeVuln: NodeVuln,
  nodeVersion: string
): Promise<any> {
  let score;

  try {
    const cves = await Promise.all(
      nodeVuln.cve.map((cve) =>
        fetch(`https://cve.circl.lu/api/cve/${cve}`).then((res) => res.json())
      )
    );

    const allCvss: number[] = cves.map((cve) => cve.cvss);

    score = Math.max(...allCvss);
  } catch (e) {
    console.error(e);
  }

  return {
    id: `NSWG-COR-${id}`,
    title: `Node.js core vulnerability #${id}`,
    CVSSv3: '-',
    credit: ['-'],
    semver: {
      vulnerable: nodeVuln.vulnerable,
    },
    exploit: '-',
    patched: [nodeVuln.patched],
    patches: [],
    fixedIn: (nodeVuln.patched || '').split(' || '),
    insights: {
      triageAdvice: null,
    },
    language: 'js',
    severity: scoreToSeverity(score ?? 9),
    cvssScore: score,
    functions: [],
    moduleName: '.node.js',
    references: [
      {
        url: nodeVuln.ref,
        title: 'Ref',
      },
    ],
    cvssDetails: [],
    description: nodeVuln.overview,
    epssDetails: null,
    identifiers: {
      CVE: nodeVuln.cve,
    },
    packageName: '.node.js',
    proprietary: true,
    creationTime: '-',
    functions_new: [],
    alternativeIds: [],
    disclosureTime: '-',
    packageManager: 'npm',
    publicationTime: '-',
    modificationTime: '-',
    socialTrendAlert: false,
    severityWithCritical: 'high',
    from: [`.node.js@${nodeVersion}`],
    upgradePath: [],
    isUpgradable: true,
    isPatchable: false,
    name: '.node.js',
    version: nodeVersion,
  };
}

async function downloadCoreDb(): Promise<Record<string, NodeVuln>> {
  const url =
    'https://raw.githubusercontent.com/nodejs/security-wg/main/vuln/core/index.json';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  return await response.json();
}

async function isSupported(version: string) {
  const supported = (await nv('supported'))
    .map((v) => `${v.major}.x`)
    .join(' || ');

  return semver.satisfies(version, supported);
}

export async function scanNodeJs({ version }: { version: string }) {
  if (!(await isSupported(version))) {
    throw new Error(`Failed: node.js@${version} is not supported anymore.`);
  }

  const coreDbVuln = await downloadCoreDb();

  const affectedBy = [];

  for (const [id, vuln] of Object.entries(coreDbVuln)) {
    if (
      semver.satisfies(version, vuln.vulnerable) &&
      vuln.patched &&
      !semver.satisfies(version, vuln.patched)
    ) {
      affectedBy.push(await formatVuln(id, vuln, version));
    }
  }

  console.log(JSON.stringify({ vulnerabilities: affectedBy }, null, 2));
}
