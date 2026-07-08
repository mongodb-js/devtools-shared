import nodeFetch from 'node-fetch';
import type {
  EvergreenApi,
  VersionRef,
  BuildRef,
  TaskRef,
  ExecutionRef,
  ArtifactRef,
} from './types';
import type { EvergreenCredentials } from './credentials';

export interface FetchResponse {
  status: number;
  ok: boolean;
  statusText: string;
  json(): Promise<unknown>;
  buffer(): Promise<Buffer>;
}

export type FetchImpl = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponse>;

export interface EvergreenClientOptions {
  baseUrl: string;
  credentials: EvergreenCredentials;
  fetchImpl?: FetchImpl;
}

interface RawVersion {
  version_id: string;
  revision: string;
}
interface RawBuild {
  _id: string;
  build_variant: string;
}
interface RawTask {
  task_id: string;
  display_name: string;
}
interface RawExecution {
  execution: number;
  status: string;
  artifacts?: ArtifactRef[];
}

export class EvergreenClient implements EvergreenApi {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: FetchImpl;

  constructor(options: EvergreenClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.headers = {
      'Api-User': options.credentials.user,
      'Api-Key': options.credentials.key,
    };
    this.fetchImpl = options.fetchImpl ?? (nodeFetch as unknown as FetchImpl);
  }

  private async get<T>(pathAndQuery: string): Promise<T | null> {
    const res = await this.fetchImpl(`${this.baseUrl}/rest/v2${pathAndQuery}`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `Evergreen request to ${pathAndQuery} failed: ${res.status} ${res.statusText}`,
      );
    }
    return (await res.json()) as T;
  }

  async versionById(versionId: string): Promise<VersionRef | null> {
    const raw = await this.get<RawVersion>(
      `/versions/${encodeURIComponent(versionId)}`,
    );
    if (!raw) return null;
    return { versionId: raw.version_id, revision: raw.revision };
  }

  async buildsForVersion(versionId: string): Promise<BuildRef[]> {
    const raw =
      (await this.get<RawBuild[]>(
        `/versions/${encodeURIComponent(versionId)}/builds`,
      )) ?? [];
    return raw.map((b) => ({ buildId: b._id, buildVariant: b.build_variant }));
  }

  async tasksForBuild(buildId: string): Promise<TaskRef[]> {
    const raw =
      (await this.get<RawTask[]>(
        `/builds/${encodeURIComponent(buildId)}/tasks`,
      )) ?? [];
    return raw.map((t) => ({ taskId: t.task_id, name: t.display_name }));
  }

  async taskExecutions(taskId: string): Promise<ExecutionRef[]> {
    const raw =
      (await this.get<RawExecution[] | RawExecution>(
        `/tasks/${encodeURIComponent(taskId)}?fetch_all_executions=true`,
      )) ?? [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((e) => ({
      execution: e.execution,
      status: e.status,
      artifacts: e.artifacts ?? [],
    }));
  }

  async downloadArtifact(url: string): Promise<Buffer> {
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `downloading artifact ${url} failed: ${res.status} ${res.statusText}`,
      );
    }
    return await res.buffer();
  }
}
