import { expect } from 'chai';
import { transformAWSAuthMechanismOptions } from './aws-auth-compat';
import { MongoClientOptions } from 'mongodb';

describe('transformAWSAuthMechanismOptions', function () {
  it('returns original uri and options if authMechanism is not MONGODB-AWS', function () {
    const uri = 'mongodb://user:pass@host:27017/db?authMechanism=SCRAM-SHA-1';
    const clientOptions: MongoClientOptions = {};
    const result = transformAWSAuthMechanismOptions({ uri, clientOptions });
    expect(result.uri).to.equal(uri);
    expect(result.clientOptions).to.equal(clientOptions);
  });

  it('transforms uri and options when MONGODB-AWS auth with credentials in connection string', async function () {
    const uri =
      'mongodb://accessKey:secretKey@host:27017/db?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:sessionToken';
    const clientOptions: MongoClientOptions = {};
    const result = transformAWSAuthMechanismOptions({ uri, clientOptions });
    expect(result.uri).to.equal(
      'mongodb://host:27017/db?authMechanism=MONGODB-AWS',
    );
    expect(result.clientOptions.auth).to.equal(undefined);
    expect(result.clientOptions.authMechanismProperties).to.have.property(
      'AWS_CREDENTIAL_PROVIDER',
    );
    const creds =
      await result.clientOptions.authMechanismProperties?.AWS_CREDENTIAL_PROVIDER?.();
    expect(creds).to.deep.equal({
      accessKeyId: 'accessKey',
      secretAccessKey: 'secretKey',
      sessionToken: 'sessionToken',
    });
  });

  it('handles special characters', async function () {
    const uri = `mongodb://${encodeURIComponent('usernäme')}:${encodeURIComponent('passwõrd')}@host:27017/db?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:${encodeURIComponent('a+b=c/d')}`;
    const clientOptions: MongoClientOptions = {};
    const result = transformAWSAuthMechanismOptions({ uri, clientOptions });
    expect(result.uri).to.equal(
      'mongodb://host:27017/db?authMechanism=MONGODB-AWS',
    );
    expect(result.clientOptions.auth).to.equal(undefined);
    expect(result.clientOptions.authMechanismProperties).to.have.property(
      'AWS_CREDENTIAL_PROVIDER',
    );
    const creds =
      await result.clientOptions.authMechanismProperties?.AWS_CREDENTIAL_PROVIDER?.();
    expect(creds).to.deep.equal({
      accessKeyId: 'usernäme',
      secretAccessKey: 'passwõrd',
      sessionToken: 'a+b=c/d',
    });
  });

  it('leaves unrelated auth mechanism properties intact', async function () {
    const uri =
      'mongodb://accessKey:secretKey@host:27017/db?authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:sessionToken,FOO:BAR';
    const clientOptions: MongoClientOptions = {};
    const result = transformAWSAuthMechanismOptions({ uri, clientOptions });
    expect(result.uri).to.equal(
      'mongodb://host:27017/db?authMechanism=MONGODB-AWS&authMechanismProperties=FOO%3ABAR',
    );
    expect(result.clientOptions.auth).to.equal(undefined);
    expect(result.clientOptions.authMechanismProperties).to.have.property(
      'AWS_CREDENTIAL_PROVIDER',
    );
    const creds =
      await result.clientOptions.authMechanismProperties?.AWS_CREDENTIAL_PROVIDER?.();
    expect(creds).to.deep.equal({
      accessKeyId: 'accessKey',
      secretAccessKey: 'secretKey',
      sessionToken: 'sessionToken',
    });
  });
});
