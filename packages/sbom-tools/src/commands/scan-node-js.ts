import fetch from 'node-fetch';
import semver from 'semver';
import nv from '@pkgjs/nv';
import { scoreToSeverity } from './severity';

type NodeVuln = {
  cve: string[];
  vulnerable: string;
  patched: string;
  reported_by: string;
  ref: string;
  overview: string;
  affectedEnvironments: string[];
};

async function formatVuln(
  id: string,
  nodeVuln: NodeVuln,
  nodeVersion: string
): Promise<any> {
  const score = await fetchScore(`NSWG-COR-${id}`, nodeVuln);
  const severity = scoreToSeverity(score);
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
    severity: severity,
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
    severityWithCritical: severity,
    from: [`.node.js@${nodeVersion}`],
    upgradePath: [],
    isUpgradable: true,
    isPatchable: false,
    name: '.node.js',
    version: nodeVersion,
  };
}

async function fetchScore(vulnId: string, nodeVuln: NodeVuln) {
  try {
    const cves = await Promise.all(
      nodeVuln.cve.map((cve) =>
        fetch(
          `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`
        ).then((res) => res.json())
      )
    );

    const getBestCvssMetricScore = (
      cvssMetrics: {
        type: 'Primary' | 'Secondary';
        cvssData: { baseScore: number };
      }[]
    ) => {
      return (
        cvssMetrics.find((m) => m.type === 'Primary')?.cvssData?.baseScore ??
        cvssMetrics.find((m) => m.type === 'Secondary')?.cvssData?.baseScore
      );
    };

    const allCvss: (number | undefined)[] = cves.map(
      (cve) =>
        getBestCvssMetricScore(
          cve?.vulnerabilities[0]?.cve?.metrics?.cvssMetricV31 ?? []
        ) ??
        getBestCvssMetricScore(
          cve?.vulnerabilities[0]?.cve?.metrics?.cvssMetricV30 ?? []
        ) ??
        getBestCvssMetricScore(
          cve?.vulnerabilities[0]?.cve?.metrics?.cvssMetricV2 ?? []
        )
    );

    const knownCvss: number[] = [];

    for (const cvss of allCvss) {
      if (typeof cvss === 'number') {
        knownCvss.push(cvss);
      }
    }

    return knownCvss.length ? Math.max(...knownCvss) : undefined;
  } catch (e) {
    console.error(
      `Error fetching score for ${vulnId}: ${(e as Error).message}`
    );
    return undefined;
  }
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
