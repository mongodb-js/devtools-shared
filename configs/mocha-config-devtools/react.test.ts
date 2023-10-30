import assert from 'assert';

describe('mocha-config-devtools/react', function () {
  it('has jsdom', function () {
    assert(!!globalThis.window);
    assert(!!globalThis.document);
    document.body.appendChild(document.createTextNode('Hello world!'));
    assert(document.body.innerHTML === 'Hello world!');
  });
});
