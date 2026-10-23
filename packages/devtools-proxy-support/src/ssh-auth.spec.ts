import { expect } from 'chai';
import { createSshAuthMethodSelector } from './ssh-auth';

describe('createSshAuthMethodSelector', function () {
  it('only attempts none without configured credentials', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: false,
      hasPrivateKey: false,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(selectAuthMethod([], false)).to.equal(false);
  });

  it('preserves the password authentication order', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: false,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(['password', 'keyboard-interactive'], false),
    ).to.equal('password');
    expect(selectAuthMethod(['keyboard-interactive'], false)).to.equal(
      'keyboard-interactive',
    );
    expect(selectAuthMethod([], false)).to.equal(false);
  });

  it('preserves the public key authentication order', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: false,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(selectAuthMethod(['publickey'], false)).to.equal('publickey');
    expect(selectAuthMethod([], false)).to.equal(false);
  });

  it('preserves the combined password and public key order', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(
        ['password', 'publickey', 'keyboard-interactive'],
        false,
      ),
    ).to.equal('password');
    expect(
      selectAuthMethod(['publickey', 'keyboard-interactive'], false),
    ).to.equal('publickey');
    expect(selectAuthMethod(['keyboard-interactive'], false)).to.equal(
      'keyboard-interactive',
    );
    expect(selectAuthMethod([], false)).to.equal(false);
  });

  it('does not let methodsLeft change the current preference order', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(selectAuthMethod(['publickey'], false)).to.equal('password');
    expect(selectAuthMethod(['keyboard-interactive'], false)).to.equal(
      'publickey',
    );
    expect(selectAuthMethod([], false)).to.equal('keyboard-interactive');
  });

  it('excludes keyboard-interactive after a partially successful password', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: false,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(['password', 'keyboard-interactive'], false),
    ).to.equal('password');
    expect(selectAuthMethod(['keyboard-interactive'], true)).to.equal(false);
  });

  it('excludes keyboard-interactive after a partially successful public key', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(
        ['password', 'publickey', 'keyboard-interactive'],
        false,
      ),
    ).to.equal('password');
    expect(
      selectAuthMethod(['publickey', 'keyboard-interactive'], false),
    ).to.equal('publickey');
    expect(selectAuthMethod(['keyboard-interactive'], true)).to.equal(false);
  });

  it('continues with a configured standard method after partial success', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(
        ['password', 'publickey', 'keyboard-interactive'],
        false,
      ),
    ).to.equal('password');
    expect(
      selectAuthMethod(['publickey', 'keyboard-interactive'], true),
    ).to.equal('publickey');
  });

  it('keeps partial success sticky after a later failed method', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: true,
      hasPrivateKey: true,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(
      selectAuthMethod(
        ['password', 'publickey', 'keyboard-interactive'],
        false,
      ),
    ).to.equal('password');
    expect(
      selectAuthMethod(['publickey', 'keyboard-interactive'], true),
    ).to.equal('publickey');
    expect(selectAuthMethod(['keyboard-interactive'], false)).to.equal(false);
  });

  it('does not return exhausted methods again', function () {
    const selectAuthMethod = createSshAuthMethodSelector({
      hasPassword: false,
      hasPrivateKey: false,
    });

    expect(selectAuthMethod(null, null)).to.equal('none');
    expect(selectAuthMethod([], false)).to.equal(false);
    expect(selectAuthMethod([], false)).to.equal(false);
  });

  it('creates independent state for every SSH connection', function () {
    const options = {
      hasPassword: true,
      hasPrivateKey: false,
    };
    const firstSelector = createSshAuthMethodSelector(options);

    expect(firstSelector(null, null)).to.equal('none');
    expect(firstSelector(['password', 'keyboard-interactive'], false)).to.equal(
      'password',
    );
    expect(firstSelector(['keyboard-interactive'], true)).to.equal(false);

    const secondSelector = createSshAuthMethodSelector(options);
    expect(secondSelector(null, null)).to.equal('none');
    expect(
      secondSelector(['password', 'keyboard-interactive'], false),
    ).to.equal('password');
    expect(secondSelector(['keyboard-interactive'], false)).to.equal(
      'keyboard-interactive',
    );
  });
});
