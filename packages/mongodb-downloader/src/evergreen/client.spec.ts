import { expect } from 'chai';
import { EvergreenClient } from './client';
import type { FetchImpl } from './client';

const BASE = 'https://evergreen.example.com';
const creds = { user: 'alice', key: 'secret' };

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: `HTTP ${status}`,
    json: () => Promise.resolve(body),
    buffer: () => Promise.resolve(Buffer.from(JSON.stringify(body))),
  };
}

describe('EvergreenClient', function () {
  it('sends Api-User / Api-Key headers and hits the REST v2 path', async function () {
    const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
    const fetchImpl: FetchImpl = (url, init) => {
      calls.push({ url, headers: init?.headers });
      return Promise.resolve(
        jsonResponse({ version_id: 'v1', revision: 'abc' }),
      );
    };
    const client = new EvergreenClient({
      baseUrl: BASE,
      credentials: creds,
      fetchImpl,
    });

    const version = await client.versionById('v1');

    expect(calls[0].url, 'hits the versions REST v2 endpoint').to.equal(
      `${BASE}/rest/v2/versions/v1`,
    );
    expect(calls[0].headers, 'auth headers are sent').to.include({
      'Api-User': 'alice',
      'Api-Key': 'secret',
    });
    expect(version, 'parses version_id/revision into camelCase').to.deep.equal({
      versionId: 'v1',
      revision: 'abc',
    });
  });

  it('returns null for a 404 version', async function () {
    const fetchImpl: FetchImpl = () => Promise.resolve(jsonResponse({}, 404));
    const client = new EvergreenClient({
      baseUrl: BASE,
      credentials: creds,
      fetchImpl,
    });
    expect(await client.versionById('missing'), '404 → null').to.equal(null);
  });

  it('throws on a non-404 error status', async function () {
    const fetchImpl: FetchImpl = () =>
      Promise.resolve(jsonResponse(Object.create(null), 500));
    const client = new EvergreenClient({
      baseUrl: BASE,
      credentials: creds,
      fetchImpl,
    });
    let err: Error | undefined;
    try {
      await client.buildsForVersion('v1');
    } catch (e) {
      err = e as Error;
    }
    expect(err, 'a 500 is surfaced as an error').to.be.an('error');
    expect(err?.message, 'a 500 is surfaced as an error').to.match(/500/);
  });

  it('maps builds, tasks, and executions into camelCase refs', async function () {
    const responders: Record<string, unknown> = Object.assign(
      Object.create(null),
      {
        [`${BASE}/rest/v2/versions/v1/builds`]: [
          { _id: 'b1', build_variant: 'ent-rhel80-x64' },
        ],
        [`${BASE}/rest/v2/builds/b1/tasks`]: [
          { task_id: 't1', display_name: 'compile' },
        ],
        [`${BASE}/rest/v2/tasks/t1?fetch_all_executions=true`]: [
          {
            execution: 0,
            status: 'success',
            artifacts: [{ name: 'Binaries', url: 'https://ev/x.tgz' }],
          },
        ],
      },
    );
    const fetchImpl: FetchImpl = (url) =>
      Promise.resolve(jsonResponse(responders[url]));
    const client = new EvergreenClient({
      baseUrl: BASE,
      credentials: creds,
      fetchImpl,
    });

    expect(
      await client.buildsForVersion('v1'),
      'build maps _id→buildId',
    ).to.deep.equal([{ buildId: 'b1', buildVariant: 'ent-rhel80-x64' }]);
    expect(
      await client.tasksForBuild('b1'),
      'task maps display_name→name',
    ).to.deep.equal([{ taskId: 't1', name: 'compile' }]);
    expect(
      await client.taskExecutions('t1'),
      'executions carry artifacts',
    ).to.deep.equal([
      {
        execution: 0,
        status: 'success',
        artifacts: [{ name: 'Binaries', url: 'https://ev/x.tgz' }],
      },
    ]);
  });
});

// Env-gated live smoke test: only runs when EVERGREEN_SMOKE_COMMIT is set and
// real credentials are available. Confirms the live REST response shapes match
// the client's parsing. Skipped by default (and in CI).
// eslint-disable-next-line mocha/max-top-level-suites
describe('EvergreenClient (live smoke)', function () {
  this.timeout(60_000);
  before(function () {
    if (
      !process.env.EVERGREEN_SMOKE_COMMIT ||
      !process.env.EVERGREEN_API_USER ||
      !process.env.EVERGREEN_API_KEY
    ) {
      this.skip();
    }
  });

  it('resolves a real version by id', async function () {
    const { resolveEvergreenAuth } = await import('./credentials');
    const { resolveVersion } = await import('./resolve');
    const auth = await resolveEvergreenAuth();
    const client = new EvergreenClient({
      baseUrl: auth.baseUrl,
      credentials: auth.credentials,
    });
    const project =
      process.env.EVERGREEN_SMOKE_PROJECT ?? 'mongodb-mongo-master';
    const pinned = await resolveVersion(
      client,
      project,
      process.env.EVERGREEN_SMOKE_COMMIT as string,
    );
    expect(pinned.revision, 'a real commit resolves to a version').to.be.a(
      'string',
    );
  });
});
