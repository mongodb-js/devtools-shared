import { expect } from 'chai';
import type { PageTemplates } from './types';
import { getStaticPage } from '../dist/get-static-page';

describe('getStaticPage', function () {
  type TestPage = 'Page1';
  type TestPagesProps = {
    Page1: {
      prop1?: string;
      prop2?: string;
      never?: string;
    };
  };

  const templates: PageTemplates<TestPagesProps> = {
    Page1: [
      {
        parameters: { prop1: '{{prop:prop1}}', prop2: '{{prop:prop2}}' },
        html: '<h1>{{prop:prop1}}</h1>{{prop:prop2}}',
      },
      {
        parameters: { prop1: '{{prop:prop1}}' },
        html: '<h1>{{prop:prop1}}</h1>',
      },
      {
        parameters: { prop2: '{{prop:prop2}}' },
        html: '<h1>default</h1>{{prop:prop2}}',
      },
      {
        parameters: {},
        html: '<h1>default</h1>',
      },
    ],
  };

  it('scenario: prop1 + prop2', function () {
    const prop1 = 'abc';
    const prop2 = 'def';
    const html = getStaticPage<TestPagesProps, TestPage>(
      'Page1',
      { prop1, prop2 },
      templates
    );
    expect(html).to.equal(`<h1>${prop1}</h1>${prop2}`);
  });

  it('scenario: no props', function () {
    const html = getStaticPage<TestPagesProps, TestPage>(
      'Page1',
      {},
      templates
    );
    expect(html).to.equal('<h1>default</h1>');
  });

  it('scenario: prop1 with special characters', function () {
    const prop1 = `'one' & "two" & <three>`;
    const html = getStaticPage<TestPagesProps, TestPage>(
      'Page1',
      { prop1 },
      templates
    );
    expect(html).to.equal(
      '<h1>&#039;one&#039; &amp; &quot;two&quot; &amp; &lt;three&gt;</h1>'
    );
  });

  it('no page template is found', function () {
    expect(() =>
      getStaticPage<TestPagesProps, TestPage>(
        'UnknownPage' as TestPage,
        {},
        templates
      )
    ).to.throw(Error, /No template found/);
  });

  it('throws with incorrect properties', function () {
    expect(() =>
      getStaticPage<TestPagesProps, TestPage>(
        'UnknownPage' as TestPage,
        { never: 'no' },
        templates
      )
    ).to.throw(Error, /No template found/);
  });
});
