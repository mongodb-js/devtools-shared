/* eslint-disable no-console */
import fetch from 'node-fetch';
import semver from 'semver';
import nv from '@pkgjs/nv';
import type {
  SnykTestProjectResult,
  SnykVulnerability,
} from '../vulnerability';
import { scoreToSeverity } from '../vulnerability';
import { vulnerabilityToSnyk } from '../vulnerability';
import { Command } from 'commander';

type NodeVulnerability = {
  cve: string[];
  vulnerable: string;
  patched: string;
  reported_by: string;
  ref: string;
  overview: string;
  affectedEnvironments: string[];
};

async function formatVulnerability(
  id: string,
  nodeVulnerability: NodeVulnerability,
  nodeVersion: string
): Promise<SnykVulnerability> {
  const score = await fetchScore(`NSWG-COR-${id}`, nodeVulnerability);

  return vulnerabilityToSnyk({
    id: `NSWG-COR-${id}`,
    title: `NSWG-COR-${id}`,
    cves: nodeVulnerability.cve,
    fixedIn: (nodeVulnerability.patched || '').split(' || '),
    packageName: '.node.js',
    score,
    severity: scoreToSeverity(score),
    urls: [{ title: 'Ref', url: nodeVulnerability.ref }],
    origins: [`.node.js@${nodeVersion}`],
    packageVersion: nodeVersion,
    description: nodeVulnerability.overview,
    vulnerableSemver: nodeVulnerability.vulnerable,
  });
}

async function fetchScore(
  vulnId: string,
  nodeVulnerability: NodeVulnerability
) {
  const cves = await Promise.all(
    nodeVulnerability.cve.map((cve) =>
      fetch(
        `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`
      ).then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(
              new Error(`Fetch ${cve} failed. Status: ${res.status}`)
            )
      )
    )
  ).catch((e) => {
    console.error(
      `Error fetching score for ${vulnId}: ${(e as Error).message}`
    );

    return [];
  });

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

  // if no suitable score is found we return 'undefined', and the severity will be set
  // as unknown. The generate-vulnerability-report will always report vulnerabilities with
  // severity=unknown as failures, unless intentionally ignored.
  return knownCvss.length ? Math.max(...knownCvss) : undefined;
}

async function downloadCoreDb(): Promise<Record<string, NodeVulnerability>> {
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

export async function scanNodeJs({
  version,
}: {
  version: string;
}): Promise<SnykTestProjectResult> {
  // the security-wg repo includes only advisories on the supported versions.
  // if the node.js version is too old we can't continue.
  if (!(await isSupported(version))) {
    throw new Error(`Failed: node.js@${version} is not supported anymore.`);
  }

  const coreDbVulnerability = await downloadCoreDb();

  const affectedBy = [];

  for (const [id, vulnerability] of Object.entries(coreDbVulnerability)) {
    if (
      semver.satisfies(version, vulnerability.vulnerable) &&
      vulnerability.patched &&
      !semver.satisfies(version, vulnerability.patched)
    ) {
      affectedBy.push(await formatVulnerability(id, vulnerability, version));
    }
  }

  return { vulnerabilities: affectedBy };
}

export const command = new Command('scan-node-js')
  .description('Scan node.js version for known vulnerabilities')
  .option('--version <version>', 'node.js version to scan for vulnerabilities')
  .action(async (options) => {
    console.info(
      JSON.stringify(
        await scanNodeJs({
          version: options.version,
        }),
        null,
        2
      )
    );
  });
