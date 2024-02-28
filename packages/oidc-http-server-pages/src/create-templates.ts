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
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'zlib';
import { writeFileSync } from 'fs';
import path from 'path';
import type { PageTemplates, ITemplate, HttpServerPageProps } from './types';
import { HttpServerPage } from './types';

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

type Component = React.FunctionComponent<Partial<Record<string, string>>> & {
  name: string;
};

function getPageTemplates<TParameters extends Record<string, string>>({
  Component,
  parameters,
}: {
  Component: Component;
  parameters: (string & keyof TParameters)[];
}): ITemplate<TParameters>[] {
  const templates: ITemplate<TParameters>[] = [];
  for (const paramsSubset of allSubsets(parameters)) {
    const propsObject = Object.fromEntries(
      paramsSubset.map((prop) => [prop, placeholder(prop)])
    );
    const markup = renderStylesToString(
      renderToStaticMarkup(React.createElement(Component, propsObject))
    );
    templates.push({
      parameters: propsObject as TParameters,
      html: markup,
    });
  }
  return templates;
}

export function generateTemplates<
  TPageParameters extends Record<
    string,
    Record<string, string>
  > = HttpServerPageProps,
  TPage extends string & keyof TPageParameters = string & keyof TPageParameters
>(
  pages: Record<
    TPage,
    {
      Component: Component;
      parameters: string[];
    }
  >
): PageTemplates<TPageParameters> {
  const templates: Partial<PageTemplates<TPageParameters>> = {};
  for (const pageName of Object.keys(pages) as TPage[]) {
    const { Component, parameters } = pages[pageName];
    const PageTemplates = getPageTemplates<TPageParameters[TPage]>({
      Component,
      parameters,
    });
    templates[pageName] = PageTemplates;
  }
  return templates as PageTemplates<TPageParameters>;
}

function generateGzip(data: string): void {
  const buffer = gzipSync(data);
  writeFileSync(path.join(__dirname, 'templates.gz'), buffer, 'binary');
}

function generateJS(data: string): void {
  const buffer = brotliCompressSync(data, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
    },
  });
  writeFileSync(
    path.join(__dirname, 'get-templates.js'),
    `
    const { brotliDecompressSync } = require('zlib');
    function getTemplates() {
      const buffer = brotliDecompressSync(
        Buffer.from(
          '${buffer.toString('base64')}', 
          'base64'
        )
      );
      return JSON.parse(buffer.toString());
    }
    module.exports = getTemplates;
  `
  );
}

export function generateCompressedTemplates<
  TPageParameters extends Record<
    string,
    Record<string, string>
  > = HttpServerPageProps,
  TPage extends string & keyof TPageParameters = string & keyof TPageParameters
>(
  pages: Record<
    TPage,
    {
      Component: Component;
      parameters: string[];
    }
  >
): void {
  const templates = JSON.stringify(
    generateTemplates<TPageParameters, TPage>(pages)
  );
  generateGzip(templates);
  generateJS(templates);
}

if (require.main === module) {
  generateCompressedTemplates({
    [HttpServerPage.OIDCErrorPage]: {
      Component: OIDCErrorPage,
      parameters: [
        'error',
        'errorDescription',
        'errorURI',
        'productDocsLink',
        'productName',
      ],
    },
    [HttpServerPage.OIDCAcceptedPage]: {
      Component: OIDCAcceptedPage,
      parameters: ['productDocsLink', 'productName'],
    },
    [HttpServerPage.OIDCNotFoundPage]: {
      Component: OIDCNotFoundPage,
      parameters: ['productDocsLink', 'productName'],
    },
  });
}
