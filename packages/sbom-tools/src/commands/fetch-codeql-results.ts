import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { deduplicateArray, pick } from '../util';
import type { Package, PackageJSON } from '../get-package-info';
import { loadDependencyFiles } from '../load-dependency-files';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Command } from 'commander';

const firstPartyAuthorEmail = 'compass@mongodb.com';
const firstPartyGithubOrg = '/mongodb-js/';

type ResolvedCommitInformation = {
  owner: string;
  repo: string;
  forPackage?: string;
  commit: string;
  alternativeRef?: string;
};

type UnresolvedRepoInformation = Omit<ResolvedCommitInformation, 'commit'> &
  Partial<ResolvedCommitInformation> & { packageVersion?: string };

// Get CodeQL SARIF reports for a single commit in a single repository
async function getSingleCommitSarif(
  octokit: Octokit,
  { owner, repo, commit, alternativeRef }: ResolvedCommitInformation,
): Promise<unknown[]> {
  const reportIds = new Set<number>();
  for (let page = 0; ; page++) {
    const { data } = await octokit.codeScanning.listRecentAnalyses({
      owner,
      repo,
      page,
    });
    const previousPageAlreadyHadSomeData = reportIds.size > 0;
    for (const item of data) {
      if (item.commit_sha === commit || item.ref === alternativeRef) {
        reportIds.add(item.id);
      }
    }
    if (previousPageAlreadyHadSomeData || data.length === 0) {
      // Stop if we're at the end or one page beyond a page that already had results
      // (so that we get all results if e.g. JS and C++ CodeQL reports are split across pages)
      break;
    }
  }
  return Promise.all(
    [...reportIds].map(async (analysis_id) => {
      return (
        await octokit.codeScanning.getAnalysis({
          owner,
          repo,
          analysis_id,
          headers: { accept: 'application/sarif+json' },
        })
      ).data;
    }),
  );
}

function repoForPackageJSON(
  packageJson: PackageJSON,
  atPath: string,
): Pick<ResolvedCommitInformation, 'owner' | 'repo'> {
  const repoUrl =
    typeof packageJson.repository === 'string'
      ? packageJson.repository
      : packageJson.repository?.url;
  if (!repoUrl)
    throw new Error(
      `Could not find repository information for package.json file at ${atPath}`,
    );
  const { owner, repo } =
    repoUrl.match(/github\.com\/(?<owner>[^/]+)\/(?<repo>[^/.]+)(?:.git)?$/)
      ?.groups ?? {};
  if (!owner || !repo)
    throw new Error(
      `Could not parse repository information for package.json file at ${atPath}`,
    );
  return { owner, repo };
}

// List all first-party dependencies in `dependencyFiles` (in the format generated by )
async function listFirstPartyDependencies(
  dependencyFiles: string[],
): Promise<UnresolvedRepoInformation[]> {
  const dependencies = await loadDependencyFiles<Package>(dependencyFiles);

  const repos: UnresolvedRepoInformation[] = [];
  for (const dependency of dependencies) {
    const packageJson: PackageJSON = JSON.parse(
      await fs.readFile(path.join(dependency.path, 'package.json'), 'utf8'),
    );
    if (
      JSON.stringify(packageJson.author)?.includes(firstPartyAuthorEmail) ||
      JSON.stringify(packageJson.repository)?.includes(firstPartyGithubOrg)
    ) {
      repos.push({
        ...repoForPackageJSON(packageJson, dependency.path),
        forPackage: dependency.name,
        packageVersion: packageJson.version,
      });
    }
  }
  return repos;
}

declare class AggregateError {
  constructor(errors: unknown[], message?: string);
}

// Look up the commit associated with a given tag
async function resolveVersionSpecifier(
  octokit: Octokit,
  repo: UnresolvedRepoInformation,
): Promise<ResolvedCommitInformation> {
  if (repo.commit) {
    return repo as ResolvedCommitInformation;
  }
  if (!repo.packageVersion) {
    throw new Error(
      `Need either 'commit' or 'packageVersion' in repo information, got ${JSON.stringify(
        repo,
      )}`,
    );
  }
  let object: { type: string; sha: string } | undefined;
  const errors: unknown[] = [];
  for (const ref of [
    `tags/v${repo.packageVersion}`,
    `tags/${repo.packageVersion}`,
    repo.forPackage && `tags/${repo.forPackage}@${repo.packageVersion}`,
  ]) {
    if (!ref) continue;
    try {
      ({
        data: { object },
      } = await octokit.git.getRef({
        owner: repo.owner,
        repo: repo.repo,
        ref,
      }));
    } catch (err: unknown) {
      errors.push(err);
    }
  }
  if (!object)
    throw new AggregateError(
      errors,
      `Unable to resolve version ${JSON.stringify(repo)}`,
    );
  if (object.type !== 'commit') {
    if (object.type !== 'tag')
      throw new Error(
        `Mismatched object type: ${JSON.stringify(
          object,
        )} (wanted tag or commit)`,
      );

    ({
      data: { object },
    } = await octokit.git.getTag({
      owner: repo.owner,
      repo: repo.repo,
      tag_sha: object.sha,
    }));
  }
  if (object.type !== 'commit')
    throw new Error(
      `Mismatched object type: ${JSON.stringify(object)} (wanted commit)`,
    );
  return {
    ...repo,
    commit: object.sha,
  };
}

async function getCurrentRepo(): Promise<ResolvedCommitInformation> {
  const commit = (
    await promisify(execFile)('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    })
  ).stdout.trim();

  let alternativeRef;
  if (process.env.GITHUB_PR_NUMBER) {
    alternativeRef = `refs/pull/${process.env.GITHUB_PR_NUMBER}/merge`;
  }

  const repo = repoForPackageJSON(
    JSON.parse(await fs.readFile('package.json', 'utf8')),
    '<root>',
  );
  return { ...repo, commit, alternativeRef };
}

interface FirstPartyDependencyList {
  repos: UnresolvedRepoInformation[];
  creationMetadata: {
    excludeRepos: string[];
    fromRepo: ResolvedCommitInformation;
  };
}

interface ListFirstPartyDependenciesForCurrentRepoOptions {
  dependencyFiles: string[];
  excludeRepos: string[];
  currentRepo?: Partial<ResolvedCommitInformation>;
}

export async function listFirstPartyDependenciesForCurrentRepo({
  dependencyFiles,
  excludeRepos,
  currentRepo,
}: ListFirstPartyDependenciesForCurrentRepoOptions): Promise<FirstPartyDependencyList> {
  if (!dependencyFiles?.length) {
    throw new Error('Missing required argument: --dependencies');
  }

  // Add the current repository we're in to the list of repos to be scanned
  let resolvedCurrentRepo: ResolvedCommitInformation;
  if (!currentRepo?.owner || !currentRepo.repo || !currentRepo.commit) {
    resolvedCurrentRepo = { ...(await getCurrentRepo()), ...currentRepo };
  } else {
    resolvedCurrentRepo = currentRepo as ResolvedCommitInformation;
  }
  let repos = await listFirstPartyDependencies(dependencyFiles);
  // Make sure the only entry for the current repo is the one we explicitly add
  excludeRepos.push(`${resolvedCurrentRepo.owner}/${resolvedCurrentRepo.repo}`);
  repos = repos.filter(
    (repo) => !excludeRepos.includes(`${repo.owner}/${repo.repo}`),
  );
  repos.push(resolvedCurrentRepo);
  repos = deduplicateArray(repos);
  return {
    repos,
    creationMetadata: { excludeRepos, fromRepo: resolvedCurrentRepo },
  };
}

export async function fetchCodeQLResults(
  octokit: Octokit,
  options:
    | ListFirstPartyDependenciesForCurrentRepoOptions
    | {
        firstPartyDependencyListFiles: string[];
      },
): Promise<unknown> {
  let repos: UnresolvedRepoInformation[];
  let creationMetadata: FirstPartyDependencyList['creationMetadata'];
  if (
    'firstPartyDependencyListFiles' in options &&
    options.firstPartyDependencyListFiles
  ) {
    const parsedFiles: FirstPartyDependencyList[] = await Promise.all(
      options.firstPartyDependencyListFiles.map(async (filename) =>
        JSON.parse(await fs.readFile(filename, 'utf8')),
      ),
    );
    const allCreationMetadatas = deduplicateArray(
      parsedFiles.map((file) => file.creationMetadata),
    );
    if (allCreationMetadatas.length !== 1) {
      throw new Error(
        `Mismatching creation metadata between different runs: ${JSON.stringify(
          allCreationMetadatas,
        )}`,
      );
    }
    [creationMetadata] = allCreationMetadatas;
    repos = deduplicateArray(parsedFiles.flatMap((file) => file.repos));
  } else if ('dependencyFiles' in options) {
    ({ repos, creationMetadata } =
      await listFirstPartyDependenciesForCurrentRepo({ ...options }));
  } else {
    throw new Error('Unknown option specification');
  }

  let resolvedRepos = await Promise.all(
    repos.map(async (repo) => await resolveVersionSpecifier(octokit, repo)),
  );
  // scan each [owner, repo, commit] triple only once, even if it appears for e.g. multiple packages
  resolvedRepos = deduplicateArray(resolvedRepos, ['owner', 'repo', 'commit']);

  const sarifs = (
    await Promise.all(
      resolvedRepos.map(async (repo) => {
        try {
          const reports = await getSingleCommitSarif(octokit, repo);
          if (reports.length === 0) {
            throw new Error('Could not find any reports');
          }
          return reports;
        } catch (err: unknown) {
          throw new Error(
            `Failed to get SARIF for repository ${JSON.stringify(
              repo,
            )}: ${String(err)}`,
            // @ts-expect-error 'cause' unsupported
            { cause: err },
          );
        }
      }),
    )
  ).flat();

  const { runs, ...rest } = sarifs[0] as any;
  for (const otherSarif of sarifs.slice(1)) {
    const { runs: otherRuns, ...otherRest } = otherSarif as any;
    if (deduplicateArray([rest, otherRest]).length > 1) {
      throw new Error(
        `Incompatible SARIF metadata between reports: ${JSON.stringify(
          rest,
        )} vs ${JSON.stringify(otherRest)}`,
      );
    }
    runs.push(...otherRuns);
  }

  const alertLookups: Record<string, Record<string, any>> = Object.create(null);
  const finalReport = { runs, ...rest };
  for (const {
    results,
    versionControlProvenance: [versionControlProvenance],
  } of finalReport.runs) {
    const repoInfo = {
      ...versionControlProvenance,
      repos: resolvedRepos.filter(
        (repo) => repo.commit === versionControlProvenance.revisionId,
      ),
    };
    for (const { properties } of results) {
      const url = properties['github/alertUrl'];
      const data = (alertLookups[url] ??= (
        await octokit.request({ url })
      ).data);
      const alertState: Record<string, unknown> = pick(data, [
        'created_at',
        'updated_at',
        'fixed_at',
        'state',
        'dismissed_at',
        'dismissed_reason',
        'dismissed_comment',
      ]);
      alertState.repos = repoInfo;
      alertState.rule = pick(data.rule, [
        'id',
        'description',
        'security_severity_level',
      ]);
      if (alertState.state !== 'dismissed') {
        throw new Error(
          `Found bad (not dismissed) alert: ${JSON.stringify(
            properties,
          )} from run at ${JSON.stringify(repoInfo)}`,
        );
      }
      properties['mongodb/alertState'] = alertState;
    }
  }
  finalReport.properties = {
    ...finalReport.properties,
    'mongodb/creationParams': {
      ...creationMetadata,
      timestamp: new Date().toISOString(),
    },
  };
  return finalReport;
}

function commaSeparatedList(value: string) {
  return value.split(',');
}

export const command = new Command('fetch-codeql-results')
  .description('Fetch CodeQL results')
  .option(
    '--dependencies <paths>',
    'Comma-separated list of dependency files',
    commaSeparatedList,
    [],
  )
  .option(
    '--exclude-repos <repos>',
    'Comma-separated list of repositories excluded from CodeQL searches',
    commaSeparatedList,
    [],
  )
  .option(
    '--current-repo <repos>',
    'Explicitly specify the current target repository in owner/repo#commit form',
    (str: string): ResolvedCommitInformation => {
      const [owner, repocommit] = str.split('/');
      const [repo, commit] = repocommit.split('#');
      return { owner, repo, commit };
    },
  )
  .option(
    '--first-party-deps-list-dest <file>',
    'If specified, only list first-party dependencies and exit. Does not interact with the Github API.',
  )
  .option(
    '--first-party-deps-list-files <paths>',
    'Comma-separated list of files created via first-party-deps-list-dest',
    commaSeparatedList,
    [],
  )
  .option('--sarif-dest <file>', 'JSON SARIF file output')
  .action(async (options) => {
    if (!options.sarifDest && !options.firstPartyDepsListDest) {
      throw new Error(
        'Missing required argument: --sarif-dest or --first-party-deps-list-dest',
      );
    }
    if (options.sarifDest && options.firstPartyDepsListDest) {
      throw new Error(
        'Cannot specify both --sarif-dest and --first-party-deps-list-dest',
      );
    }

    const opts = {
      dependencyFiles: options.dependencies,
      excludeRepos: options.excludeRepos,
      currentRepo: options.currentRepo,
      firstPartyDependencyListFiles: options.firstPartyDepsListFiles,
    };

    if (options.firstPartyDepsListDest) {
      const result = await listFirstPartyDependenciesForCurrentRepo(opts);
      await fs.writeFile(
        options.firstPartyDepsListDest,
        JSON.stringify(result, null, 2),
      );
      return;
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: { fetch },
    });
    const finalReport = await fetchCodeQLResults(octokit, opts);
    await fs.writeFile(options.sarifDest, JSON.stringify(finalReport, null, 2));
  });
