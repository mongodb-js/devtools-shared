import os from 'os';
import {
  createSLSDisaggregatedStorageOptions,
  resolveSLSDir,
  type MongoClusterOptions,
  type SLSMultiCellEnvironment,
} from '@mongodb-js/mongodb-runner';
import type { StartClusterInput } from './schema';

export interface RunnerClusterOptions {
  options: MongoClusterOptions;
  /** Passed separately: `start()` in mongodb-runner overwrites `options.args` with this value. */
  args?: string[];
  /** Set for DSC clusters so the allocated SLS ports can be reported. */
  sls?: SLSMultiCellEnvironment;
}

/**
 * Translates the tool input into mongodb-runner's `MongoClusterOptions`.
 * Topology-specific fields are passed through as-is: mongodb-runner ignores
 * options that do not apply to the selected topology.
 */
export async function toRunnerOptions(
  input: StartClusterInput,
  { defaultLogDir }: { defaultLogDir?: string } = {},
): Promise<RunnerClusterOptions> {
  const options: MongoClusterOptions = {
    topology: input.topology,
    tmpDir: input.tmpDir ?? os.tmpdir(),
    version: input.version,
    downloadUrl: input.downloadUrl,
    binDir: input.binDir,
    downloadDir: input.downloadDir,
    logDir: input.logDir ?? defaultLogDir,
    docker: input.docker,
    host: input.host,
    users: input.users,
    oidc: input.oidc,
    tlsAddClientKey: input.tlsAddClientKey,
    requireApiVersion: input.requireApiVersion,
    secondaries: input.secondaries,
    arbiters: input.arbiters,
    rsMembers: input.rsMembers,
    shards: input.shards,
    mongosArgs: input.mongosArgs,
  };

  let sls: SLSMultiCellEnvironment | undefined;
  if (input.slsDir !== undefined) {
    if (!input.slsDir) {
      throw new Error(
        'slsDir must be the path to a directory containing the SLS docker compose file and its helper files',
      );
    }
    const { composeFile } = await resolveSLSDir(input.slsDir, {
      requireManifest: input.slsImageTag === undefined,
    });
    const disaggregatedStorage = await createSLSDisaggregatedStorageOptions({
      composeFile,
      imageTag: input.slsImageTag,
    });
    options.disaggregatedStorage = disaggregatedStorage;
    sls = disaggregatedStorage.sls;
  }

  return { options, args: input.args, sls };
}
