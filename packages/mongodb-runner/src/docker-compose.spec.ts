import { expect } from 'chai';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { DockerComposeProject, sanitizeForFilename } from './docker-compose';
import { eventually, uuid } from './util';

describe('docker-compose', function () {
  describe('sanitizeForFilename', function () {
    it('keeps safe characters', function () {
      expect(sanitizeForFilename('mongodb-runner_1.2.3')).to.equal(
        'mongodb-runner_1.2.3',
      );
    });

    it('strips path separators and other unsafe characters', function () {
      expect(sanitizeForFilename('../../etc/passwd')).to.equal('....etcpasswd');
      expect(sanitizeForFilename('my proj/name\\x:y')).to.equal('myprojnamexy');
      expect(sanitizeForFilename(new Date(0).toISOString())).to.equal(
        '1970-01-01T000000.000Z',
      );
    });
  });

  describe('DockerComposeProject', function () {
    let tmpDir: string;
    let origPath: string | undefined;
    let dockerArgsLog: string;

    // The fake `docker` exits immediately, but close() only writes the
    // snapshot fallback once the log follower process is no longer running,
    // so wait for that to avoid racing against the follower's exit.
    async function waitForLogFollowerExit(
      project: DockerComposeProject,
    ): Promise<void> {
      const { logFollowerPid } = project.serialize() as {
        logFollowerPid?: number;
      };
      if (logFollowerPid === undefined) return;
      await eventually(() => {
        try {
          process.kill(logFollowerPid, 0);
        } catch {
          return; // process is gone
        }
        throw new Error(`log follower ${logFollowerPid} is still running`);
      });
    }

    before(function () {
      // The fake `docker` executable is a shell script.
      if (process.platform === 'win32') this.skip();
    });

    beforeEach(async function () {
      tmpDir = path.join(os.tmpdir(), `docker-compose-spec-${uuid()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      dockerArgsLog = path.join(tmpDir, 'docker-args.log');
      // Fake `docker` that records its arguments and emits a log line for
      // `logs` subcommands.
      await fs.writeFile(
        path.join(tmpDir, 'docker'),
        `#!/bin/sh
  echo "$@" >> '${dockerArgsLog}'
  case "$*" in
    *" logs "*) echo "some-service-1 | fake log line";;
  esac
  exit 0
  `,
        { mode: 0o755 },
      );
      origPath = process.env.PATH;
      process.env.PATH = `${tmpDir}:${origPath ?? ''}`;
    });

    afterEach(async function () {
      process.env.PATH = origPath;
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('streams container logs into logDir and preserves them across close()', async function () {
      const logDir = path.join(tmpDir, 'logs');
      const project = await DockerComposeProject.start('compose.yml', {
        projectName: 'proj/../with unsafe:chars',
        logDir,
      });

      // The log follower writes to the file asynchronously.
      const followerLogFile = path.join(
        logDir,
        'docker-compose-proj..withunsafechars.log',
      );
      await eventually(async () => {
        expect(await fs.readFile(followerLogFile, 'utf8')).to.include(
          'fake log line',
        );
      });

      await waitForLogFollowerExit(project);
      await project.close();

      const invocations = await fs.readFile(dockerArgsLog, 'utf8');
      expect(invocations).to.include('up -d');
      expect(invocations).to.include('logs --follow --no-color --timestamps');
      expect(invocations).to.include('down --volumes');

      // The fake follower is dead by close() time, so a snapshot dump is
      // also written.
      const files = await fs.readdir(logDir);
      expect(
        files.filter((f) =>
          /^docker-compose-proj\.\.withunsafechars-.+\.log$/.test(f),
        ),
      ).to.have.lengthOf(1);
    });

    it('does not capture logs when logDir is not set', async function () {
      const project = await DockerComposeProject.start('compose.yml', {
        projectName: 'no-capture-proj',
      });
      await project.close();
      const invocations = await fs.readFile(dockerArgsLog, 'utf8');
      expect(invocations).to.include('up -d');
      expect(invocations).to.include('down --volumes');
      expect(invocations).to.not.include('logs');
    });

    it('treats an empty-string logDir as disabled', async function () {
      const project = await DockerComposeProject.start('compose.yml', {
        projectName: 'empty-logdir-proj',
        logDir: '',
      });
      await project.close();
      const invocations = await fs.readFile(dockerArgsLog, 'utf8');
      expect(invocations).to.not.include('logs');
    });

    it('survives serialization round-trips', async function () {
      const logDir = path.join(tmpDir, 'logs');
      const project = await DockerComposeProject.start('compose.yml', {
        projectName: 'serialized-proj',
        logDir,
      });
      const restored = DockerComposeProject.deserialize(project.serialize());
      await waitForLogFollowerExit(project);
      await restored.close();
      const invocations = await fs.readFile(dockerArgsLog, 'utf8');
      expect(invocations).to.include('down --volumes');
      // The snapshot fallback still knows about logDir after deserialization.
      const files = await fs.readdir(logDir);
      expect(
        files.filter((f) => /^docker-compose-serialized-proj-.+\.log$/.test(f)),
      ).to.have.lengthOf(1);
    });
  });
});
