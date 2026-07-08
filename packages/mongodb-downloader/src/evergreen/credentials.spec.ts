import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  credentialsFromEnv,
  parseEvergreenYml,
  resolveEvergreenAuth,
  DEFAULT_EVERGREEN_BASE_URL,
} from './credentials';

describe('credentialsFromEnv', function () {
  it('reads EVERGREEN_API_USER / EVERGREEN_API_KEY', function () {
    const creds = credentialsFromEnv({
      EVERGREEN_API_USER: 'alice',
      EVERGREEN_API_KEY: 'secret',
    } as NodeJS.ProcessEnv);
    expect(creds, 'both env vars present yields credentials').to.deep.equal({
      user: 'alice',
      key: 'secret',
    });
  });

  it('returns null when either var is missing', function () {
    expect(
      credentialsFromEnv({ EVERGREEN_API_USER: 'alice' } as NodeJS.ProcessEnv),
      'a missing key yields null',
    ).to.equal(null);
    expect(
      credentialsFromEnv({} as NodeJS.ProcessEnv),
      'no env vars yields null',
    ).to.equal(null);
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('parseEvergreenYml', function () {
  it('extracts flat api_user / api_key / api_server_host', function () {
    const parsed = parseEvergreenYml(
      [
        'api_server_host: "https://evergreen.example.com/api"',
        'api_user: bob',
        "api_key: 'topsecret'",
        'ui_server_host: https://ignored',
      ].join('\n'),
    );
    expect(parsed.user, 'unquoted value parsed').to.equal('bob');
    expect(parsed.key, 'single-quoted value unquoted').to.equal('topsecret');
    expect(parsed.baseUrl, 'double-quoted host, /api suffix stripped').to.equal(
      'https://evergreen.example.com',
    );
  });

  it('returns empty fields when keys are absent', function () {
    const parsed = parseEvergreenYml('some_other_key: value\n');
    expect(parsed, 'no recognized keys yields empty object').to.deep.equal({});
  });
});

describe('resolveEvergreenAuth', function () {
  it('prefers env credentials and the default base URL', async function () {
    const auth = await resolveEvergreenAuth({
      env: {
        EVERGREEN_API_USER: 'alice',
        EVERGREEN_API_KEY: 'secret',
      } as NodeJS.ProcessEnv,
      configPath: '/nonexistent/.evergreen.yml',
    });
    expect(auth.credentials, 'env creds win').to.deep.equal({
      user: 'alice',
      key: 'secret',
    });
    expect(auth.baseUrl, 'defaults to the public host').to.equal(
      DEFAULT_EVERGREEN_BASE_URL,
    );
  });

  it('falls back to ~/.evergreen.yml and its host', async function () {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evg-creds-'));
    const configPath = path.join(dir, '.evergreen.yml');
    await fs.writeFile(
      configPath,
      'api_user: bob\napi_key: k\napi_server_host: https://evergreen.example.com/api\n',
    );
    const auth = await resolveEvergreenAuth({
      env: {} as NodeJS.ProcessEnv,
      configPath,
    });
    expect(
      auth.credentials,
      'config creds used when env is empty',
    ).to.deep.equal({ user: 'bob', key: 'k' });
    expect(auth.baseUrl, 'config host used').to.equal(
      'https://evergreen.example.com',
    );
  });

  it('throws an actionable error when no credentials are found', async function () {
    let err: Error | undefined;
    try {
      await resolveEvergreenAuth({
        env: {} as NodeJS.ProcessEnv,
        configPath: '/nonexistent/.evergreen.yml',
      });
    } catch (e) {
      err = e as Error;
    }
    expect(err, 'missing creds throws').to.be.instanceOf(Error);
    expect(err!.message, 'error names the env vars and config file')
      .to.match(/EVERGREEN_API_USER/)
      .and.to.match(/\.evergreen\.yml/);
  });
});
