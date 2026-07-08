import type { EvergreenApi, PinnedVersion, ArtifactRef } from './types';

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

const STATUS_SUCCESS = 'success';

/**
 * From a pinned version, walk build-variant → named task → lowest-numbered
 * successful execution → named artifact. Each hop errors clearly if unsatisfied.
 */
export async function resolveArtifact(
  api: EvergreenApi,
  pinned: PinnedVersion,
  buildVariant: string,
  compileTask: string,
  artifactName: string,
): Promise<ArtifactRef> {
  const builds = await api.buildsForVersion(pinned.versionId);
  const build = builds.find((b) => b.buildVariant === buildVariant);
  if (!build) {
    throw new Error(
      `version ${pinned.versionId} has no build for variant '${buildVariant}'`,
    );
  }

  const tasks = await api.tasksForBuild(build.buildId);
  const task = tasks.find((t) => t.name === compileTask);
  if (!task) {
    throw new Error(
      `build '${buildVariant}' has no task named '${compileTask}'`,
    );
  }

  const executions = [...(await api.taskExecutions(task.taskId))].sort(
    (a, b) => a.execution - b.execution,
  );
  const success = executions.find((e) => e.status === STATUS_SUCCESS);
  if (!success) {
    throw new Error(`task '${compileTask}' has no successful execution`);
  }

  const artifact = success.artifacts.find((a) => a.name === artifactName);
  if (!artifact) {
    throw new Error(
      `successful '${compileTask}' has no artifact named '${artifactName}'`,
    );
  }
  return artifact;
}
