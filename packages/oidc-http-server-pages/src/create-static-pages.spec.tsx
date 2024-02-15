import React from 'react';
import type { Component } from 'react';
import { generateStaticPagesModule } from './create-static-pages';
import { H1 } from '@mongodb-js/compass-components';
import { runInNewContext } from 'vm';
import zlib from 'zlib';
import sinon from 'ts-sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('generateStaticPagesModule', function () {
  let exports: Record<
    string,
    (props: React.ComponentProps<typeof Component>) => string
  >;

  beforeEach(function () {
    function Component({ prop1, prop2 }: { prop1?: string; prop2?: string }) {
      return (
        <div>
          <H1>{prop1 || 'default'}</H1>
          {prop2 && <p data-attr={prop2}>{prop2}</p>}
        </div>
      );
    }

    const result = generateStaticPagesModule([[Component, ['prop1', 'prop2']]]);
    exports = {};
    const require = sinon.stub();
    require.throws();
    require.withArgs('zlib').returns(zlib);
    runInNewContext(result, {
      module: { exports },
      require,
      Buffer,
    });
  });

  it('includes selected props', function () {
    expect(exports.Component({ prop1: 'prop1value' })).to.match(
      /<h1[^>]+>prop1value<\/h1>/
    );
    expect(exports.Component({ prop1: 'prop1value' })).not.to.include('prop2');
    expect(exports.Component({ prop1: 'prop1value' })).not.to.include(
      'data-attr'
    );
    expect(exports.Component({ prop2: 'prop2value' })).to.match(
      /<h1[^>]+>default<\/h1>/
    );
    expect(exports.Component({ prop2: 'prop2value' })).to.match(
      /<p[^>]+>prop2value<\/p>/
    );
    expect(exports.Component({ prop2: 'prop2value' })).to.include(
      'data-attr="prop2value"'
    );
  });

  it('properly escapes props', function () {
    expect(exports.Component({ prop2: 'prop2<&"\'>value' })).to.include(
      'data-attr="prop2&lt;&amp;&quot;&#039;&gt;value"'
    );
    expect(exports.Component({ prop2: 'prop2<&"\'>value' })).to.include(
      '>prop2&lt;&amp;&quot;&#039;&gt;value</p>'
    );
  });

  it('includes relevant style information', function () {
    expect(exports.Component({ prop1: 'prop1value' })).to.include('<style');
  });
});
