import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  createSLSDisaggregatedStorageOptions,
  createSLSMultiCellEnvironment,
  readPinnedSlsCommit,
  resolveSLSDir,
} from './sls';
import { allocatePorts, uuid } from './util';
import { isBindable } from '../test/helpers';

const FIXTURES = path.resolve(__dirname, '..', 'test', 'fixtures', 'sls');

describe('sls', function () {
  describe('readPinnedSlsCommit', function () {
    it('reads pinned_sls_commit from a manifest', async function () {
      expect(
        await readPinnedSlsCommit(path.join(FIXTURES, 'complete')),
        'should return the pinned commit verbatim',
      ).to.equal('abc123def456');
    });

    it('names the path it looked at when the manifest is absent', async function () {
      const missing = path.join(FIXTURES, 'does-not-exist');
      const err = await readPinnedSlsCommit(missing).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'error should name the manifest path that was checked',
      ).to.include(path.join(missing, 'manifest.json'));
      expect(
        (err as Error).message,
        'error should mention the override flag',
      ).to.include('--slsImageTag');
    });

    it('reports a manifest that is missing the key', async function () {
      const err = await readPinnedSlsCommit(
        path.join(FIXTURES, 'no-key'),
      ).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'error should name the missing key',
      ).to.include('pinned_sls_commit');
    });

    it('reports a malformed manifest', async function () {
      const err = await readPinnedSlsCommit(
        path.join(FIXTURES, 'malformed'),
      ).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'error should say the manifest could not be parsed',
      ).to.match(/parse/i);
    });
  });

  describe('resolveSLSDir', function () {
    it('resolves an SLS dir addressed by install root', async function () {
      const root = path.join(FIXTURES, 'sls-dir-complete');
      const slsDir = await resolveSLSDir(root);
      expect(
        slsDir.composeFile,
        'compose file should be found under buildscripts/modules/atlas',
      ).to.equal(
        path.join(
          root,
          'buildscripts',
          'modules',
          'atlas',
          'sls-multicell-docker-compose.yml',
        ),
      );
      expect(
        slsDir.manifestFile,
        'manifest should sit next to the compose file',
      ).to.equal(path.join(slsDir.atlasDir, 'manifest.json'));
    });

    it('resolves an SLS dir addressed by its atlas directory', async function () {
      const atlasDir = path.join(
        FIXTURES,
        'sls-dir-complete',
        'buildscripts',
        'modules',
        'atlas',
      );
      const slsDir = await resolveSLSDir(atlasDir);
      expect(
        slsDir.atlasDir,
        'passing the atlas dir directly should also work',
      ).to.equal(atlasDir);
    });

    it('lists every missing file, not just the first', async function () {
      const err = await resolveSLSDir(
        path.join(FIXTURES, 'sls-dir-incomplete'),
      ).catch((e: Error) => e);
      const message = (err as Error).message;
      expect(
        message,
        'error should say this is not a disagg-capable build',
      ).to.include('not a disaggregated-storage-capable MongoDB build');
      expect(message, 'should report the missing proto').to.include(
        'slsbackup.proto',
      );
      expect(message, 'should report the missing flags state too').to.include(
        'flags-state.json',
      );
    });

    it('rejects a required file that is actually a directory', async function () {
      const err = await resolveSLSDir(
        path.join(FIXTURES, 'sls-dir-dir-placeholder'),
      ).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'a directory named like a required file should be reported missing',
      ).to.include('slsbackup.proto');
    });

    it('rejects a directory that is not a MongoDB build', async function () {
      const err = await resolveSLSDir(path.join(FIXTURES, 'not-a-build')).catch(
        (e: Error) => e,
      );
      expect(
        (err as Error).message,
        'a non-build directory should be rejected clearly',
      ).to.include('not a disaggregated-storage-capable MongoDB build');
    });

    it('returns absolute paths for a relative directory', async function () {
      const relative = path.relative(
        process.cwd(),
        path.join(FIXTURES, 'sls-dir-complete'),
      );
      const slsDir = await resolveSLSDir(relative);
      expect(
        path.isAbsolute(slsDir.composeFile),
        'the compose file must be absolute so it survives a change of cwd',
      ).to.be.true;
      expect(
        path.isAbsolute(slsDir.atlasDir),
        'the atlas dir must be absolute too',
      ).to.be.true;
    });

    it('requires a manifest by default', async function () {
      const err = await resolveSLSDir(
        path.join(FIXTURES, 'sls-dir-no-manifest'),
      ).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'a missing manifest should be reported by default',
      ).to.include('manifest.json');
    });

    it('allows a missing manifest when the tag is supplied', async function () {
      const dir = path.join(FIXTURES, 'sls-dir-no-manifest');
      const slsDir = await resolveSLSDir(dir, { requireManifest: false });
      expect(
        slsDir.composeFile,
        'the compose file should still be located without a manifest',
      ).to.equal(
        path.join(
          dir,
          'buildscripts',
          'modules',
          'atlas',
          'sls-multicell-docker-compose.yml',
        ),
      );
    });
  });

  describe('createSLSMultiCellEnvironment', function () {
    let tmpDir: string;
    let composeFile: string;

    beforeEach(async function () {
      tmpDir = path.join(os.tmpdir(), `sls-spec-${uuid()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      composeFile = path.join(tmpDir, 'compose.yml');
      await fs.writeFile(
        composeFile,
        `services:
  cms-cell1-0:
    ports:
      - "\${CMS_CELL1_PORT:-30001}:27998"
  cms-cell3-0:
    ports:
      - "\${CMS_CELL3_PORT:-30001}:27998"
      - "\${CMS_CELL3_EXTRA_PORT:-30002}:27999"
`,
      );
    });

    afterEach(async function () {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('allocates a unique host port for every compose port mapping', async function () {
      const sls = await createSLSMultiCellEnvironment({
        composeFile,
        imageTag: 'test-tag',
      });
      try {
        const envPorts = Object.entries(sls.env)
          .filter(([key]) => key.endsWith('_PORT'))
          .map(([, value]) => Number(value));
        expect(envPorts).to.have.lengthOf(3);
        expect(new Set(envPorts).size).to.equal(
          3,
          'every compose port mapping should get a distinct host port',
        );

        const mainPorts = Object.values(sls.ports);
        expect(mainPorts).to.have.lengthOf(2);
        expect(new Set(mainPorts).size).to.equal(
          2,
          'the ports map should contain only unique values',
        );
      } finally {
        await sls.releasePorts();
      }
    });

    it('reserves its ports until releasePorts is called', async function () {
      const sls = await createSLSMultiCellEnvironment({
        composeFile,
        imageTag: 'test-tag',
      });
      const reserved = new Set(
        Object.entries(sls.env)
          .filter(([key]) => key.endsWith('_PORT'))
          .map(([, value]) => Number(value)),
      );
      try {
        const other = await allocatePorts(reserved.size);
        try {
          for (const port of other.ports) {
            expect(reserved.has(port), `port ${port} is reserved`).to.equal(
              false,
            );
          }
        } finally {
          await other.release();
        }
      } finally {
        await sls.releasePorts();
      }
    });

    const manifestComposeFile = path.join(
      FIXTURES,
      'complete',
      'docker-compose.yml',
    );

    it('defaults the image tag to the adjacent manifest', async function () {
      const { env } = await createSLSMultiCellEnvironment({
        composeFile: manifestComposeFile,
      });
      expect(
        env.SLS_IMAGE_TAG,
        'should read the tag from the manifest next to the compose file',
      ).to.equal('abc123def456');
    });

    it('lets an explicit image tag override the manifest', async function () {
      const { env } = await createSLSMultiCellEnvironment({
        composeFile: manifestComposeFile,
        imageTag: 'explicit-tag',
      });
      expect(
        env.SLS_IMAGE_TAG,
        'an explicit tag should take precedence over the manifest',
      ).to.equal('explicit-tag');
    });
  });

  describe('createSLSDisaggregatedStorageOptions', function () {
    let tmpDir: string;
    let composeFile: string;

    beforeEach(async function () {
      tmpDir = path.join(os.tmpdir(), `sls-spec-${uuid()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      composeFile = path.join(tmpDir, 'compose.yml');
      await fs.writeFile(
        composeFile,
        `services:
  cms-cell1-0:
    ports:
      - "\${CMS_CELL1_PORT:-30001}:27998"
`,
      );
    });

    afterEach(async function () {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('holds its ports until beforeComposeUp runs', async function () {
      const options = await createSLSDisaggregatedStorageOptions({
        composeFile,
        imageTag: 'test-tag',
      });
      const port = Number(options.env.CMS_CELL1_PORT);
      expect(
        await isBindable(port),
        'port should be reserved while the environment is built',
      ).to.equal(false);

      await options.beforeComposeUp?.();

      expect(
        await isBindable(port),
        'port should be free once beforeComposeUp has released it',
      ).to.equal(true);
    });

    describe('setupShard', function () {
      let dockerArgsLog: string;
      let getLogServersResponseFile: string;
      let origPath: string | undefined;

      before(function () {
        // The fake `docker` executable is a shell script.
        if (process.platform === 'win32') this.skip();
      });

      beforeEach(async function () {
        dockerArgsLog = path.join(tmpDir, 'docker-args.log');
        getLogServersResponseFile = path.join(tmpDir, 'get-log-servers.json');
        // Fake `docker` that records each invocation's arguments (one per
        // line) and answers the grpcurl calls setupShard makes through
        // `docker exec <testdriver> /grpcurl ...`.
        await fs.writeFile(
          path.join(tmpDir, 'docker'),
          `#!/bin/sh
for arg in "$@"; do
  printf '%s\\n' "$arg" >> '${dockerArgsLog}'
done
case "$*" in
  *SchedulerService/GetLogServers*)
    cat '${getLogServersResponseFile}'
    ;;
  *ControlPlaneService/StartLog*)
    echo '{}'
    ;;
  *)
    echo "fake docker: unexpected invocation: $*" >&2
    exit 1
    ;;
esac
`,
          { mode: 0o755 },
        );
        origPath = process.env.PATH;
        process.env.PATH = `${tmpDir}:${origPath ?? ''}`;
      });

      afterEach(function () {
        process.env.PATH = origPath;
      });

      async function setGetLogServersResponse(response: unknown) {
        await fs.writeFile(getLogServersResponseFile, JSON.stringify(response));
      }

      async function readDockerArgs(): Promise<string[]> {
        return (await fs.readFile(dockerArgsLog, 'utf8'))
          .split('\n')
          .filter((line) => line !== '');
      }

      // grpcurl invocations have the fixed shape `... -d <payload> <address>
      // <method>`, so the payload sits two lines above the method line; the
      // neighboring lines are asserted to pin that shape down.
      function grpcurlPayload(
        lines: string[],
        method: string,
      ): Record<string, unknown> {
        const methodIndex = lines.indexOf(method);
        expect(
          methodIndex,
          `a grpcurl call to ${method} should have been recorded`,
        ).to.not.equal(-1);
        expect(
          lines[methodIndex - 1],
          'the grpcurl target address should precede the method name',
        ).to.equal('crs-cell1-0:27996');
        expect(
          lines[methodIndex - 3],
          'the recorded payload should follow the -d flag',
        ).to.equal('-d');
        return JSON.parse(lines[methodIndex - 2]) as Record<string, unknown>;
      }

      async function startLogPayload(): Promise<Record<string, unknown>> {
        return grpcurlPayload(
          await readDockerArgs(),
          'schedulerservice.v1.ControlPlaneService/StartLog',
        );
      }

      it('sends log_server_ids to StartLog, not the legacy server_ids', async function () {
        await setGetLogServersResponse({
          server_ids: [
            { uri: 'http://local.sls.mmscloudteam.com:30101/', cell: 'cell1' },
            { uri: 'http://local.sls.mmscloudteam.com:30102/', cell: 'cell2' },
          ],
          log_server_ids: [
            '01M7K7RM9J6S8Y5CR6WA449PQS',
            '01M7K7RM9J6S8Y5CR6WA449PQT',
          ],
        });
        const options = await createSLSDisaggregatedStorageOptions({
          composeFile,
          imageTag: 'test-tag',
        });
        try {
          await options.setupShard?.({
            index: 0,
            isConfigServer: false,
            members: [],
          });
        } finally {
          await options.beforeComposeUp?.();
        }

        expect(
          await startLogPayload(),
          'StartLog should receive the log_server_ids values and no legacy server_ids',
        ).to.deep.equal({
          log_id: 1,
          log_server_ids: [
            '01M7K7RM9J6S8Y5CR6WA449PQS',
            '01M7K7RM9J6S8Y5CR6WA449PQT',
          ],
          ancestry: { ancestors: [] },
        });
      });

      it('accepts the logServerIds spelling of the GetLogServers response', async function () {
        await setGetLogServersResponse({
          serverIds: [
            { uri: 'http://local.sls.mmscloudteam.com:30103/', cell: 'cell3' },
          ],
          logServerIds: [
            '01M7K7RM9J6S8Y5CR6WA449PQU',
            '01M7K7RM9J6S8Y5CR6WA449PQV',
          ],
        });
        const options = await createSLSDisaggregatedStorageOptions({
          composeFile,
          imageTag: 'test-tag',
        });
        try {
          await options.setupShard?.({
            index: 0,
            isConfigServer: false,
            members: [],
          });
        } finally {
          await options.beforeComposeUp?.();
        }

        expect(
          await startLogPayload(),
          'the logServerIds spelling should flow through to log_server_ids',
        ).to.deep.equal({
          log_id: 1,
          log_server_ids: [
            '01M7K7RM9J6S8Y5CR6WA449PQU',
            '01M7K7RM9J6S8Y5CR6WA449PQV',
          ],
          ancestry: { ancestors: [] },
        });
      });

      it('rejects a response that only has the legacy server_ids', async function () {
        await setGetLogServersResponse({
          server_ids: [
            { uri: 'http://local.sls.mmscloudteam.com:30101/', cell: 'cell1' },
          ],
        });
        const options = await createSLSDisaggregatedStorageOptions({
          composeFile,
          imageTag: 'test-tag',
          setupMaxRetries: 0,
        });
        const err = await options
          .setupShard?.({ index: 0, isConfigServer: false, members: [] })
          .catch((e: Error) => e);
        await options.beforeComposeUp?.();

        expect(
          err,
          'setupShard should reject when the response has no log_server_ids',
        ).to.be.an('error');
        expect(
          (err as Error).message,
          'a response without log_server_ids must be rejected instead of falling back to server_ids',
        ).to.equal('SLS GetLogServers returned no servers');
        expect(
          await readDockerArgs(),
          'StartLog must not be invoked when no log_server_ids are available',
        ).to.not.include('schedulerservice.v1.ControlPlaneService/StartLog');
      });
    });
  });
});
