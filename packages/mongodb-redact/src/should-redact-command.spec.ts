import { expect } from 'chai';
import { shouldRedactCommand } from '.';

describe('shouldRedactCommand', function () {
  for (const command of [
    'db.createUser({ user: "test" })',
    'db.auth("user", "pass")',
    'db.updateUser("user", { roles: [] })',
    'db.changeUserPassword("user", "newpass")',
    'db = connect("mongodb://localhost")',
    'new Mongo("mongodb://localhost")',
  ]) {
    it(`returns true for ${command}`, function () {
      expect(shouldRedactCommand(command)).to.be.true;
    });
  }

  for (const command of [
    'db.collection.find()',
    'db.collection.find({authentication: true})',
    'db.getUsers()',
    'show dbs',
  ]) {
    it(`returns false for ${command}`, function () {
      expect(shouldRedactCommand(command)).to.be.false;
    });
  }
});
