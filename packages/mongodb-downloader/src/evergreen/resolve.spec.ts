import { expect } from 'chai';
import type {
  EvergreenApi,
  VersionRef,
  BuildRef,
  TaskRef,
  ExecutionRef,
} from './types';
import { isFullSha, resolveVersion } from './resolve';

// eslint-disable-next-line mocha/no-exports
export class FakeEvergreen implements EvergreenApi {
  versions: VersionRef[] = [];
  builds: BuildRef[] = [];
  tasks: TaskRef[] = [];
  executions: ExecutionRef[] = [];
  artifactBytes: Buffer = Buffer.alloc(0);
  versionByIdCalls: string[] = [];

  versionById(versionId: string): Promise<VersionRef | null> {
    this.versionByIdCalls.push(versionId);
    return Promise.resolve(
      this.versions.find((v) => v.versionId === versionId) ?? null,
    );
  }
  buildsForVersion(): Promise<BuildRef[]> {
    return Promise.resolve(this.builds);
  }
  tasksForBuild(): Promise<TaskRef[]> {
    return Promise.resolve(this.tasks);
  }
  taskExecutions(): Promise<ExecutionRef[]> {
    return Promise.resolve(this.executions);
  }
  downloadArtifact(): Promise<Buffer> {
    return Promise.resolve(this.artifactBytes);
  }
}

const FULL_SHA = 'a8cf5e030082d30493b0b7903b0b3af6816ee93f';

// eslint-disable-next-line mocha/max-top-level-suites
describe('isFullSha', function () {
  it('accepts a 40-char lowercase hex string', function () {
    expect(isFullSha(FULL_SHA), 'a full 40-char hex SHA is valid').to.equal(
      true,
    );
  });

  it('rejects abbreviated SHAs, branches, and tags', function () {
    expect(isFullSha('a8cf5e0'), 'abbreviated SHA is not a full SHA').to.equal(
      false,
    );
    expect(isFullSha('main'), 'a branch name is not a full SHA').to.equal(
      false,
    );
    expect(isFullSha('r8.0.0'), 'a tag is not a full SHA').to.equal(false);
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('resolveVersion', function () {
  it('resolves a full SHA via the deterministic by-id path', async function () {
    const api = new FakeEvergreen();
    const versionId = `mongodb_mongo_master_${FULL_SHA}`;
    api.versions = [{ versionId, revision: FULL_SHA }];

    const pinned = await resolveVersion(api, 'mongodb-mongo-master', FULL_SHA);

    expect(
      pinned.versionId,
      'version id is {project}_{sha} with dashes→underscores',
    ).to.equal(versionId);
    expect(
      pinned.revision,
      'pinned revision is the resolved revision',
    ).to.equal(FULL_SHA);
  });

  it('normalizes an uppercase SHA to the lowercase version id', async function () {
    const api = new FakeEvergreen();
    const versionId = `mongodb_mongo_master_${FULL_SHA}`;
    api.versions = [{ versionId, revision: FULL_SHA }];

    const pinned = await resolveVersion(
      api,
      'mongodb-mongo-master',
      FULL_SHA.toUpperCase(),
    );

    expect(
      pinned.versionId,
      'uppercase SHA maps to the lowercase version id',
    ).to.equal(versionId);
  });

  it('rejects a non-full-SHA before making any API call', async function () {
    const api = new FakeEvergreen();
    let err: Error | undefined;
    try {
      await resolveVersion(api, 'mongodb-mongo-master', 'a8cf5e0');
    } catch (e) {
      err = e as Error;
    }
    expect(err, 'an abbreviated SHA throws').to.be.instanceOf(Error);
    expect(err!.message, 'error explains the full-SHA requirement').to.match(
      /full 40-character git SHA/,
    );
    expect(
      api.versionByIdCalls.length,
      'no API call is made for invalid input',
    ).to.equal(0);
  });

  it('errors clearly when the version does not exist', async function () {
    const api = new FakeEvergreen(); // no versions
    let err: Error | undefined;
    try {
      await resolveVersion(api, 'mongodb-mongo-master', FULL_SHA);
    } catch (e) {
      err = e as Error;
    }
    expect(err, 'a missing version throws').to.be.instanceOf(Error);
    expect(err!.message, 'error names the project and constructed version id')
      .to.match(/mongodb-mongo-master/)
      .and.to.match(new RegExp(`mongodb_mongo_master_${FULL_SHA}`));
  });
});
