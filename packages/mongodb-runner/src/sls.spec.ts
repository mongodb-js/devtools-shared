import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  createSLSDisaggregatedStorageOptions,
  createSLSMultiCellEnvironment,
} from './sls';
import { allocatePorts, uuid } from './util';
import { isBindable } from '../test/helpers';

describe('sls', function () {
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
  });
});
