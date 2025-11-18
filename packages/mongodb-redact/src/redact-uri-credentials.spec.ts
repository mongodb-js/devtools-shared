import { expect } from 'chai';
import { redactUriCredentials } from './redact-uri-credentials';
import redact from '.';

describe('redactUriCredentials', function () {
  const testCases: Array<{
    description: string;
    input: string;
    expected: string;
  }> = [
    {
      description: 'should redact username and password',
      input: 'mongodb://user:password@localhost:27017/admin',
      expected: 'mongodb://<credentials>@localhost:27017/admin',
    },
    {
      description: 'should redact only username when no password',
      input: 'mongodb://user@localhost:27017/admin',
      expected: 'mongodb://<credentials>@localhost:27017/admin',
    },
    {
      description: 'should redact credentials in SRV URIs',
      input: 'mongodb+srv://admin:sec!ret@cluster0.example.com/test',
      expected: 'mongodb+srv://<credentials>@cluster0.example.com/test',
    },
    {
      description: 'should redact passwords with ! character',
      input: 'mongodb://user:p@ss!word@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should redact passwords with # character',
      input: 'mongodb://admin:test#123@db.example.com:27017/',
      expected: 'mongodb://<credentials>@db.example.com:27017/',
    },
    {
      description: 'should redact passwords with $ character',
      input: 'mongodb://user:price$100@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should redact passwords with % character',
      input: 'mongodb://user:test%pass@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should redact passwords with & character',
      input: 'mongodb://user:rock&roll@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should redact URL-encoded passwords',
      input: 'mongodb://user:my%20password@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description:
        'should redact complex passwords with multiple special characters',
      input: 'mongodb://user:p&ssw!rd#123$@host.com:27017/db?authSource=admin',
      expected: 'mongodb://<credentials>@host.com:27017/db?authSource=admin',
    },
    {
      description: 'should redact usernames with special characters',
      input: 'mongodb://us!er:password@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should return URI unchanged when no credentials',
      input: 'mongodb://localhost:27017/admin',
      expected: 'mongodb://localhost:27017/admin',
    },
    {
      description: 'should handle simple localhost URI',
      input: 'mongodb://localhost',
      expected: 'mongodb://localhost/',
    },
    {
      description: 'should handle URI with database',
      input: 'mongodb://localhost/mydb',
      expected: 'mongodb://localhost/mydb',
    },
    {
      description: 'should handle URI with query parameters',
      input: 'mongodb://localhost:27017/mydb?ssl=true&replicaSet=rs0',
      expected: 'mongodb://localhost:27017/mydb?ssl=true&replicaSet=rs0',
    },
    // URIs with replica sets
    {
      description: 'should redact credentials in replica set URIs',
      input:
        'mongodb://user:pass@host1:27017,host2:27017,host3:27017/db?replicaSet=rs0',
      expected:
        'mongodb://<credentials>@host1:27017,host2:27017,host3:27017/db?replicaSet=rs0',
    },
    {
      description: 'should handle replica set URIs without credentials',
      input:
        'mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=myReplSet',
      expected:
        'mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=myReplSet',
    },
    // URIs with IP addresses
    {
      description: 'should redact credentials with IP address host',
      input: 'mongodb://user:password@192.168.1.100:27017/mydb',
      expected: 'mongodb://<credentials>@192.168.1.100:27017/mydb',
    },
    {
      description: 'should handle IP address URIs without credentials',
      input: 'mongodb://10.0.0.5:27017/admin',
      expected: 'mongodb://10.0.0.5:27017/admin',
    },
    // SRV URIs
    {
      description: 'should handle SRV URIs without credentials',
      input: 'mongodb+srv://cluster0.example.com/test',
      expected: 'mongodb+srv://cluster0.example.com/test',
    },
    // URIs with query parameters
    {
      description: 'should redact credentials and preserve query parameters',
      input:
        'mongodb://user:pass@host.com/db?authSource=admin&readPreference=primary',
      expected:
        'mongodb://<credentials>@host.com/db?authSource=admin&readPreference=primary',
    },
    {
      description: 'should handle URIs with SSL options',
      input:
        'mongodb://admin:secret@localhost:27017/mydb?ssl=true&tlsAllowInvalidCertificates=true',
      expected:
        'mongodb://<credentials>@localhost:27017/mydb?ssl=true&tlsAllowInvalidCertificates=true',
    },
    {
      description: 'should redact credentials in SRV URIs with query params',
      input:
        'mongodb+srv://admin:secret@mycluster.mongodb.net/mydb?retryWrites=true',
      expected:
        'mongodb+srv://<credentials>@mycluster.mongodb.net/mydb?retryWrites=true',
    },
    // Edge cases
    {
      description: 'should handle empty password',
      input: 'mongodb://user:@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description:
        'should handle password with only special characters (URL-encoded)',
      input: 'mongodb://user:%21%40%23%24%25@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should handle very long passwords',
      input: `mongodb://user:${'a'.repeat(100)}@localhost:27017/`,
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
    {
      description: 'should handle international characters in password',
      input: 'mongodb://user:пароль@localhost:27017/',
      expected: 'mongodb://<credentials>@localhost:27017/',
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, function () {
      const result = redactUriCredentials(input);
      expect(result).to.equal(expected);

      expect(redact(input)).to.equal('<mongodb uri>');
    });
  });
});
