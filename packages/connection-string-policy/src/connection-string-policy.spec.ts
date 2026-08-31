import { expect } from 'chai';
import { checkConnectionStringPolicy } from './connection-string-policy';

describe('checkConnectionStringPolicy', function () {
  describe('parsing', function () {
    it('does not accept a connection string it cannot parse', function () {
      const result = checkConnectionStringPolicy('not a connection string');
      expect(result.unparseable).to.equal(true);
      expect(result.withinPolicy).to.equal(false);
    });

    it('accepts a plain srv connection string', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/',
      );
      expect(result).to.deep.equal({
        withinPolicy: true,
        unparseable: false,
        flaggedOptions: [],
      });
    });
  });

  describe('tls', function () {
    it('flags a non-srv connection to a remote host without tls', function () {
      const result = checkConnectionStringPolicy('mongodb://example.net/');
      expect(result.flaggedOptions).to.deep.equal(['ssl/tls']);
      expect(result.withinPolicy).to.equal(false);
    });

    it('accepts a non-srv connection to a remote host with tls=true', function () {
      const result = checkConnectionStringPolicy(
        'mongodb://example.net/?tls=true',
      );
      expect(result.flaggedOptions).to.deep.equal([]);
    });

    it('accepts a non-srv connection to localhost without tls', function () {
      const result = checkConnectionStringPolicy('mongodb://localhost:27017/');
      expect(result.flaggedOptions).to.deep.equal([]);
    });

    it('flags an srv connection that opts out of tls', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?tls=false',
      );
      expect(result.flaggedOptions).to.deep.equal(['ssl/tls']);
    });
  });

  describe('connection string options', function () {
    it('accepts allowed options', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?appName=myApp&maxPoolSize=10&readPreference=primary',
      );
      expect(result.flaggedOptions).to.deep.equal([]);
    });

    it('flags disallowed options', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?proxyHost=proxy.example.net',
      );
      expect(result.flaggedOptions).to.deep.equal(['proxyHost']);
    });

    it('flags options it does not know about', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?somethingNewFromAFutureDriver=1',
      );
      expect(result.flaggedOptions).to.deep.equal([
        'somethingNewFromAFutureDriver',
      ]);
    });

    it('reports every flagged option, not just the tls one', function () {
      // Regression test: an earlier version of this logic stopped collecting
      // option names as soon as the tls check had flagged something, which hid
      // the more interesting options from anyone displaying the result.
      const result = checkConnectionStringPolicy(
        'mongodb://example.net/?tls=false&proxyHost=proxy.example.net&serializeFunctions=true',
      );
      expect(result.flaggedOptions).to.have.members([
        'ssl/tls',
        'proxyHost',
        'serializeFunctions',
      ]);
    });

    it('reports a repeated option only once', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?proxyHost=a.example.net&proxyHost=b.example.net',
      );
      expect(result.flaggedOptions).to.deep.equal(['proxyHost']);
    });
  });

  describe('authMechanismProperties', function () {
    it('accepts allowed properties', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?authMechanismProperties=CANONICALIZE_HOST_NAME:forward',
      );
      expect(result.flaggedOptions).to.deep.equal([]);
    });

    it('accepts AWS_SESSION_TOKEN, which the driver no longer knows about', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?authMechanismProperties=AWS_SESSION_TOKEN:token',
      );
      expect(result.flaggedOptions).to.deep.equal([]);
    });

    it('flags kerberos service overrides', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?authMechanismProperties=SERVICE_HOST:evil.example.net',
      );
      expect(result.flaggedOptions).to.deep.equal([
        'authMechanismProperties.SERVICE_HOST',
      ]);
    });

    it('flags ENVIRONMENT', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?authMechanism=MONGODB-OIDC&authMechanismProperties=ENVIRONMENT:azure',
      );
      expect(result.flaggedOptions).to.deep.equal([
        'authMechanismProperties.ENVIRONMENT',
      ]);
    });

    it('flags properties it does not know about', function () {
      const result = checkConnectionStringPolicy(
        'mongodb+srv://cluster0.example.net/?authMechanismProperties=SOMETHING_NEW:1',
      );
      expect(result.flaggedOptions).to.deep.equal([
        'authMechanismProperties.SOMETHING_NEW',
      ]);
    });
  });
});
