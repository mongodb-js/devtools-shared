import { expect } from 'chai';
import { shouldRedactCommand } from '.';

describe('shouldRedactCommand', function () {
  describe('shouldRedactCommand', function () {
    it('returns true for createUser commands', function () {
      expect(shouldRedactCommand('db.createUser({ user: "test" })')).to.be.true;
    });

    it('returns true for auth commands', function () {
      expect(shouldRedactCommand('db.auth("user", "pass")')).to.be.true;
    });

    it('returns true for updateUser commands', function () {
      expect(shouldRedactCommand('db.updateUser("user", { roles: [] })')).to.be
        .true;
    });

    it('returns true for changeUserPassword commands', function () {
      expect(shouldRedactCommand('db.changeUserPassword("user", "newpass")')).to
        .be.true;
    });

    it('returns true for connect commands', function () {
      expect(shouldRedactCommand('db = connect("mongodb://localhost")')).to.be
        .true;
    });

    it('returns true for Mongo constructor', function () {
      expect(shouldRedactCommand('new Mongo("mongodb://localhost")')).to.be
        .true;
    });

    it('returns false for non-sensitive commands', function () {
      expect(shouldRedactCommand('db.collection.find()')).to.be.false;
    });

    it('returns false for partial words like "authentication"', function () {
      // The \b (word boundary) should prevent matching "auth" within "authentication"
      expect(shouldRedactCommand('db.collection.find({authentication: true})'))
        .to.be.false;
    });

    it('returns false for getUsers command', function () {
      expect(shouldRedactCommand('db.getUsers()')).to.be.false;
    });

    it('returns false for show commands', function () {
      expect(shouldRedactCommand('show dbs')).to.be.false;
    });
  });
});
