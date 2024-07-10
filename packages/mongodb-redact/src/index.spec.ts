import { expect } from 'chai';
import redact from './';

/* eslint no-multi-str:0 */
const PRIVATE_KEY =
  '-----BEGIN RSA PRIVATE KEY----- \
MIICXgIBAAKBgQC8fAGwrWndvhjdgnkekAkWqGDUOOzTiiGNvAWwTwmLuI7SWCzi \
suFYjwyYaCwsJ1biyMlhiWKtFl4tGaEEYbDj4US8kRmaxmCKpXuN1mMKqVEtlZh8 \
vLpEFxz2KQpK0LrejAd8eLnCJCQtUIwJJf0btQMibAyxH0/SgSmwR/t18QIDAQAB \
AoGBALM9rhHI55sictz7fZjt2ma8mtBWjgihHEV/310J3IcNbGxlw9GV0Kx55L1u \
m0sl4f9qd++USc1WLxrue2wCRsbckw4PbQDtPD+7RXgO4bMuDeurHSDm0JSqj/P8 \
nvrOQ3wB8BPYJHebfMfOiMERptiDYlSExrHsDFNA1o7xGrwBAkEA31flS/fUShWW \
Zb9Ugw+qOPDTqifRvm9+EfzS0surU6ryfuX3NeZtj9R/vuYLRvfLaly/YEsmZdWX \
L/MLoHqhwQJBANgLSLiMRcFkAsNhRGs0UIXc7LB64Ba9HZ93oNwUZANbH53lWUaN \
0FeuVUUc2QDlkbV1DwlDBiCIaPb2GMQigDECQQDFsS2b0uCsOvOHWJZb9E++Wx1g \
biKwKEw1a87JG9KpGpXPUYtCwJaWS4hP15x/0vLRUQttFtgEJ83NeZr/D82BAkAP \
CeoL/qe0aJPQqeqrU77vMou/VS5YJt3zBc7KwxibKzKuORLX2HNSRy5kWze32kMk \
UHu1d1br2NMFrefXb1dhAkEAl5HshFiSCqPcPKeAU/0ndX8tTqhibNaJmnG9aX9r \
I1mP6zZWN3FLv8M/ISFROkTjs7HZQ81V7dvKmIymRUyQ7A== \
-----END RSA PRIVATE KEY-----';

const BIN_DATA = `db = db.getSiblingDB("__realm_sync")
db.history.updateOne({"_id": ObjectId("63ed1d522d8573fa5c203660")}, {$set:{changeset:BinData(5, "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC")}})`;

describe('mongodb-redact', function () {
  describe('Types', function () {
    it('should work with string types', function () {
      const res = redact('foo@bar.com');
      expect(res).to.equal('<email>');
    });

    it('should work with non-string types (no redaction)', function () {
      const res = redact(13);
      expect(res).to.equal(13);
    });

    it('should work with array types', function () {
      const res = redact([
        'foo@bar.com',
        '192.168.0.5',
        9,
        '/Users/john/apps/index.js',
      ]);
      expect(res).to.deep.equal([
        '<email>',
        '<ip address>',
        9,
        '/Users/<user>/apps/index.js',
      ]);
    });

    it('should work with object types', function () {
      const res = redact({
        email: 'foo@bar.com',
        ip: '192.168.0.5',
        number: 9,
        path: '/Users/john/apps/index.js',
      });
      expect(res).to.deep.equal({
        email: '<email>',
        ip: '<ip address>',
        number: 9,
        path: '/Users/<user>/apps/index.js',
      });
    });

    it('should work with BinData', function () {
      const res = redact(BIN_DATA);
      expect(res).to.include(
        'db.history.updateOne({"_id": ObjectId("63ed1d522d8573fa5c203660")}, {$set:{changeset:BinData(5, "<base64>")}})'
      );
    });
  });

  describe('Regexes', function () {
    it('should redact emails', function () {
      expect(redact('some.complex+email@somedomain.co.uk')).to.equal('<email>');
    });

    it('should redact ip addresses', function () {
      expect(redact('10.0.0.1')).to.equal('<ip address>');
    });

    it('should redact private keys', function () {
      expect(redact(PRIVATE_KEY)).to.equal('<private key>');
    });

    it('should redact OS X user paths', function () {
      let res = redact(
        '/Users/foo/Applications/MongoDB%20Compass.app/Contents/Resources/app/index.html'
      );
      expect(res).to.equal(
        '/Users/<user>/Applications/MongoDB%20Compass.app/Contents/Resources/app/index.html'
      );
      res = redact('/Users/JohnDoe/Documents/letter.pages');
      expect(res).to.equal(res, '/Users/<user>/Documents/letter.pages');
      res = redact('file:///Users/JohnDoe/Documents/letter.pages');
      expect(res).to.equal(res, 'file:///Users/<user>/Documents/letter.pages');
    });

    it('should redact Windows user paths using backward slash', function () {
      let res = redact(
        'C:\\Users\\foo\\AppData\\Local\\MongoDBCompass\\app-1.0.1\\resources\\app\\index.js'
      );
      expect(res).to.equal(res, 'C:\\Users\\<user>\\index.js');
      res = redact('c:\\Users\\JohnDoe\\test');
      expect(res).to.equal(res, 'c:\\Users\\<user>\\test');
      res = redact('C:\\Documents and Settings\\JohnDoe\\test');
      expect(res).to.equal(res, 'C:\\Documents and Settings\\<user>\\test');
    });

    it('should redact Windows user paths using forward slash', function () {
      const res = redact(
        'C:/Users/foo/AppData/Local/MongoDBCompass/app-1.0.1/resources/app/index.js'
      );
      expect(res).to.equal(
        res,
        'C:/Users/<user>/AppData/Local/MongoDBCompass/app-1.0.1/resources/app/index.js'
      );
    });

    it('should redact Linux user paths', function () {
      const res = redact('/usr/foo/myapps/resources/app/index.html');
      expect(res).to.equal(res, '/usr/<user>/myapps/resources/app/index.html');
    });

    it('should redact URLs', function () {
      let res = redact('http://www.google.com');
      expect(res).to.equal('<url>');
      res = redact('https://www.mongodb.org');
      expect(res).to.equal('<url>');
      res = redact('https://www.youtube.com/watch?v=Q__3R5aUkWQ');
      expect(res).to.equal('<url>');
    });

    it('should redact MongoDB connection URIs', function () {
      let res = redact(
        'mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test&connectTimeoutMS=300000'
      );
      expect(res).to.equal('<mongodb uri>');
      res = redact('mongodb://localhost,localhost:27018,localhost:27019');
      expect(res).to.equal('<mongodb uri>');
    });

    it('should redact general linux/unix user paths', function () {
      let res = redact('/home/foobar/documents/tan-numbers.txt');
      expect(res).to.equal('/home/<user>/documents/tan-numbers.txt');
      res = redact('/usr/foobar/documents/tan-numbers.txt');
      expect(res).to.equal('/usr/<user>/documents/tan-numbers.txt');
      res = redact('/var/users/foobar/documents/tan-numbers.txt');
      expect(res).to.equal('/var/users/<user>/documents/tan-numbers.txt');
    });

    it('should redact Compass Schema URL fragments', function () {
      const res = redact(
        'index.html?connection_id=e5938750-038e-4cab-b2ba-9ccb9ed7e2a2#schema/db.collection'
      );
      expect(res).to.equal(
        'index.html?connection_id=e5938750-038e-4cab-b2ba-9ccb9ed7e2a2#schema/<namespace>'
      );
    });
  });

  describe('Misc', function () {
    it('should redact strings with context', function () {
      const res = redact('send me an email to john.doe@company.com please.');
      expect(res).to.equal('send me an email to <email> please.');
    });

    it('should work on arrays of arrays', function () {
      const res = redact([
        ['foo@bar.com', 'bar@baz.net'],
        'http://github.com/mongodb-js',
      ]);
      expect(res).to.deep.equal([['<email>', '<email>'], '<url>']);
    });

    it('should work on nested objects', function () {
      const res = redact({
        obj: {
          path: '/Users/thomas/something.txt',
        },
      });
      expect(res).to.deep.equal({
        obj: {
          path: '/Users/<user>/something.txt',
        },
      });
    });
  });
});
