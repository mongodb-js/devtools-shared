import { expect } from 'chai';
import { OIDCMockProvider } from './';

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
}

function decodeJwtPayload(token: string | undefined): Record<string, unknown> {
  if (!token) throw new Error('Expected a JWT');
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
  );
}

describe('OIDCMockProvider', function () {
  let provider: OIDCMockProvider;

  async function post(
    path: string,
    params: Record<string, string>,
  ): Promise<TokenResponse> {
    const res = await fetch(new URL(path, provider.issuer), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    return (await res.json()) as TokenResponse;
  }

  async function issueInitialTokens(): Promise<TokenResponse> {
    const { device_code } = await post('/device', {
      client_id: 'test-client',
      scope: 'openid',
    });
    return await post('/token', { device_code: device_code as string });
  }

  before(async function () {
    provider = await OIDCMockProvider.create({
      getTokenPayload: () => ({
        expires_in: 3600,
        payload: { sub: 'testuser' },
      }),
    });
  });

  after(async function () {
    await provider.close();
  });

  it('exists', function () {
    expect(OIDCMockProvider).to.be.a('function');
  });

  it('rotates the refresh token on a refresh_token grant', async function () {
    const initial = await issueInitialTokens();
    expect(initial.refresh_token).to.be.a('string');

    const refreshed = await post('/token', {
      grant_type: 'refresh_token',
      refresh_token: initial.refresh_token as string,
      client_id: 'test-client',
    });

    expect(refreshed.access_token).to.be.a('string');
    expect(refreshed.access_token).to.not.equal(initial.access_token);
    expect(refreshed.refresh_token).to.be.a('string');
    expect(refreshed.refresh_token).to.not.equal(initial.refresh_token);

    const initialClaims = decodeJwtPayload(initial.id_token);
    const refreshedClaims = decodeJwtPayload(refreshed.id_token);
    expect(refreshedClaims).to.include({
      sub: 'testuser',
      aud: 'test-client',
    });
    expect(refreshedClaims.sub).to.equal(initialClaims.sub);
  });

  it('rejects a refresh token that was already rotated', async function () {
    const initial = await issueInitialTokens();
    await post('/token', {
      grant_type: 'refresh_token',
      refresh_token: initial.refresh_token as string,
      client_id: 'test-client',
    });

    const reused = await post('/token', {
      grant_type: 'refresh_token',
      refresh_token: initial.refresh_token as string,
      client_id: 'test-client',
    });
    expect(reused.error).to.match(/Invalid or expired refresh_token/);
  });
});
