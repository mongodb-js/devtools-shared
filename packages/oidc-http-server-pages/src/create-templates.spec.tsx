import React from 'react';
import { expect } from 'chai';
import { H1 } from '@mongodb-js/compass-components';
import { generateTemplates } from './create-templates';
import type { PageTemplates } from './types';

describe('generateTemplates', function () {
  type TestPage = 'Page1';
  type TestPagesProps = {
    Page1: {
      prop1?: string;
      prop2?: string;
      never?: string;
    };
  };
  function Component1({ prop1, prop2 }: { prop1?: string; prop2?: string }) {
    return (
      <div>
        <H1>{prop1 || 'default'}</H1>
        {prop2 && <p data-attr={prop2}>{prop2}</p>}
      </div>
    );
  }

  let result: PageTemplates<TestPagesProps>;
  before(function () {
    result = generateTemplates<TestPagesProps, TestPage>({
      Page1: {
        Component: Component1,
        parameters: ['prop1', 'prop2'],
      },
    });
  });

  it('creates 4 templates for Page1', function () {
    expect(result).to.have.own.property('Page1');
    expect(result['Page1']).to.have.length(4);
  });

  it('includes a template with placeholders for prop1 + prop2', function () {
    const templates = result['Page1'];
    const fullTemplate = templates.find(
      ({ parameters }) =>
        Object.keys(parameters).includes('prop1') &&
        Object.keys(parameters).includes('prop2')
    );
    expect(fullTemplate).to.exist;
    expect(fullTemplate).to.have.own.property('html');
    expect(fullTemplate?.html).to.match(/<h1[^>]+>{{prop:prop1}}<\/h1>/);
    expect(fullTemplate?.html).to.match(/<p[^>]+>{{prop:prop2}}<\/p>/);
  });

  it('includes a template with placeholders for no props', function () {
    const templates = result['Page1'];
    const fullTemplate = templates.find(
      ({ parameters }) => Object.keys(parameters).length === 0
    );
    expect(fullTemplate).to.exist;
    expect(fullTemplate).to.have.own.property('html');
    expect(fullTemplate?.html).to.match(/<h1[^>]+>default<\/h1>/);
    expect(fullTemplate?.html).not.to.contain('{{prop:prop1}}');
    expect(fullTemplate?.html).not.to.contain('{{prop:prop2}}');
  });
});
