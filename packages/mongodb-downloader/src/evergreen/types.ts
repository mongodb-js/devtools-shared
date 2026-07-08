export interface VersionRef {
  versionId: string;
  revision: string;
}

/** A version that has been uniquely resolved from a commit. */
export interface PinnedVersion {
  versionId: string;
  revision: string;
}

export interface BuildRef {
  buildId: string;
  buildVariant: string;
}

export interface TaskRef {
  taskId: string;
  name: string;
}

export interface ArtifactRef {
  name: string;
  url: string;
}

export interface ExecutionRef {
  execution: number;
  status: string;
  artifacts: ArtifactRef[];
}

/**
 * The Evergreen REST surface the downloader needs, behind an interface so
 * resolution logic can be unit-tested offline against a fake.
 */
export interface EvergreenApi {
  /** Fetch a single version by id; resolves to null when it does not exist (HTTP 404). */
  versionById(versionId: string): Promise<VersionRef | null>;
  buildsForVersion(versionId: string): Promise<BuildRef[]>;
  tasksForBuild(buildId: string): Promise<TaskRef[]>;
  taskExecutions(taskId: string): Promise<ExecutionRef[]>;
  downloadArtifact(url: string): Promise<Buffer>;
}
