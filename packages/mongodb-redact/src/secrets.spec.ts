import { expect } from 'chai';
import { SECRET_KIND } from './secrets';
import type { SecretKind } from './secrets';
import { redact } from './index';

describe('dictionary-based secret redaction', function () {
  for (const kind of SECRET_KIND) {
    it(`redacts content of kind '${kind}'`, function () {
      const secret = '123456';
      const content = '123456';

      const redacted = redact(content, [{ value: secret, kind: kind }]);

      expect(redacted).equal(`<${kind}>`);
    });
  }

  for (const invalidValue of [null, undefined, false, 0]) {
    it(`returns itself on an invalid value like ${String(invalidValue)}`, function () {
      expect(redact(invalidValue as any, [])).equal(invalidValue);
    });
  }

  it('redacts multiple coincidences of a secret', function () {
    const secret = '123456';
    const content = '123456 abc 123456';

    const redacted = redact(content, [{ value: secret, kind: 'password' }]);

    expect(redacted).to.equal('<password> abc <password>');
  });

  it('rejects unknown types', function () {
    expect(() =>
      redact('some content to redact', [
        {
          value: 'some',
          kind: 'invalid' as SecretKind,
        },
      ]),
    ).throw();
  });

  it('redacts secrets in between word boundaries', function () {
    const secret = '123456';
    const content = '.123456.';

    const redacted = redact(content, [{ value: secret, kind: 'password' }]);

    expect(redacted).equal('.<password>.');
  });

  it('does not redact content that seems a secret inside another word', function () {
    const secret = '123456';
    const content = 'abc123456def';

    const redacted = redact(content, [{ value: secret, kind: 'password' }]);

    expect(redacted).equal('abc123456def');
  });

  it('escapes values so using it in regexes is safe', function () {
    const secret = '.+';
    const content = '.abcdef.';

    const redacted = redact(content, [{ value: secret, kind: 'password' }]);

    expect(redacted).equal('.abcdef.');
  });

  it('redacts on arrays', function () {
    const secret = 'abc';
    const content = ['abc', 'cbd'];

    const redacted = redact(content, [{ value: secret, kind: 'password' }]);

    expect(redacted).deep.equal(['<password>', 'cbd']);
  });

  it('redacts on objects', function () {
    const pwdSecret = '123456';
    const usrSecret = 'admin';

    const content = { pwd: pwdSecret, usr: usrSecret };

    const redacted = redact(content, [
      { value: pwdSecret, kind: 'password' },
      { value: usrSecret, kind: 'user' },
    ]);

    expect(redacted).deep.equal({
      pwd: '<password>',
      usr: '<user>',
    });
  });
});
