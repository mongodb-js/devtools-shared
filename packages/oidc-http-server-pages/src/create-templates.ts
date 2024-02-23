// Helper script to prepare templates of the
// OIDC plugin pages. This script is run during package compilation.
//
// By generating static pages, we can avoid having all dependencies
// of this package pulling in react, react-dom, leafygreen, compass-components, etc.
//
// Furthermore, the templates are consumable by other languages
// https://jira.mongodb.org/browse/COMPASS-7646
//

import { renderToStaticMarkup } from 'react-dom/server';
import { renderStylesToString } from '@leafygreen-ui/emotion';
import {
  OIDCAcceptedPage,
  OIDCErrorPage,
  OIDCNotFoundPage,
} from './pages-source';
import React from 'react';
import type { PageTemplates, ITemplate } from './types';
import { Page } from './types';

/** Iterate all sub-arrays of an array */
function* allSubsets<T>(array: T[]): Iterable<T[]> {
  if (array.length === 0) {
    yield [];
    return;
  }
  const first = array[0];
  for (const slicedSubset of allSubsets(array.slice(1))) {
    yield [first, ...slicedSubset];
    yield slicedSubset;
  }
}

function placeholder(prop: string): string {
  return `{{prop:${prop}}}`;
}

type Component<PropNames extends string> = React.FunctionComponent<
  Partial<Record<PropNames, string>>
> & {
  name: string;
};

function getPageTemplates<PropNames extends string>({
  Component,
  parameters,
}: {
  Component: Component<PropNames>;
  parameters: string[];
}): ITemplate[] {
  const templates: ITemplate[] = [];
  for (const paramsSubset of allSubsets(parameters)) {
    const propsObject = paramsSubset.reduce((obj, prop) => {
      obj[prop] = placeholder(prop);
      return obj;
    }, {} as Record<string, string>);
    const markup = renderStylesToString(
      renderToStaticMarkup(React.createElement(Component, propsObject))
    );
    templates.push({
      parameters: propsObject,
      html: markup,
    });
  }
  return templates;
}

function generateTemplates<PropNames extends string>(
  pages: Record<
    Page,
    {
      Component: Component<PropNames>;
      parameters: string[];
    }
  >
): PageTemplates {
  const templates: Partial<PageTemplates> = {};
  for (const pageName of Object.keys(pages) as Page[]) {
    const { Component, parameters } = pages[pageName];
    const PageTemplates = getPageTemplates({ Component, parameters });
    templates[pageName] = PageTemplates;
  }
  return templates as PageTemplates;
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      generateTemplates({
        [Page.OIDCErrorPage]: {
          Component: OIDCErrorPage,
          parameters: [
            'error',
            'errorDescription',
            'errorURI',
            'productDocsLink',
            'productName',
          ],
        },
        [Page.OIDCAcceptedPage]: {
          Component: OIDCAcceptedPage,
          parameters: ['productDocsLink', 'productName'],
        },
        [Page.OIDCNotFoundPage]: {
          Component: OIDCNotFoundPage,
          parameters: ['productDocsLink', 'productName'],
        },
      })
    )
  );
}
