import assert from 'assert';

describe('mocha-config-devtools/react', function () {
  it('has jsdom', function () {
    assert(!!globalThis.window);
    assert(!!globalThis.document);
    document.body.appendChild(document.createTextNode('Hello world!'));
    assert(document.body.innerHTML === 'Hello world!');
  });

  it('parses container queries', function () {
    const tag = document.createElement('style');
    tag.appendChild(
      document.createTextNode(
        `@container compass-workspace-container (width < 900px){.test{display:none;}}`
      )
    );
    document.head.appendChild(tag);
  });
});
