import type { EvergreenApi, PinnedVersion } from './types';

/** A full git SHA: exactly 40 lowercase hex digits. */
export function isFullSha(s: string): boolean {
  return /^[0-9a-f]{40}$/.test(s);
}

/**
 * Pin the unique mainline version for `(project, commit)`. Requires a full 40-char
 * git SHA, which maps deterministically to its version id (`{project}_{sha}` with
 * dashes replaced by underscores) and is fetched by id.
 */
export async function resolveVersion(
  api: EvergreenApi,
  project: string,
  commit: string,
): Promise<PinnedVersion> {
  const sha = commit.toLowerCase();
  if (!isFullSha(sha)) {
    throw new Error(
      `Evergreen commit must be a full 40-character git SHA, got '${commit}'. ` +
        `Abbreviated SHAs, branches, and tags are not supported.`,
    );
  }
  const versionId = `${project.replace(/-/g, '_')}_${sha}`;
  const version = await api.versionById(versionId);
  if (!version) {
    throw new Error(
      `commit ${sha} is not on the ${project} mainline waterfall ` +
        `(version ${versionId} does not exist)`,
    );
  }
  return { versionId: version.versionId, revision: version.revision };
}
