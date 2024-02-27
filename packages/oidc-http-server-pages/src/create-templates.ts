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
import type { PageTemplates, ITemplate } from './types';
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

function getPageTemplates({
  Component,
  parameters,
}: {
  Component: Component;
  parameters: string[];
}): ITemplate[] {
  const templates: ITemplate[] = [];
  for (const paramsSubset of allSubsets(parameters)) {
    const propsObject = Object.fromEntries(
      paramsSubset.map((prop) => [prop, placeholder(prop)])
    );
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

export function generateTemplates<TPage extends string = HttpServerPage>(
  pages: Record<
    TPage,
    {
      Component: Component;
      parameters: string[];
    }
  >
): PageTemplates<TPage> {
  const templates: Partial<PageTemplates<TPage>> = {};
  for (const pageName of Object.keys(pages) as TPage[]) {
    const { Component, parameters } = pages[pageName];
    const PageTemplates = getPageTemplates({ Component, parameters });
    templates[pageName] = PageTemplates;
  }
  return templates as PageTemplates<TPage>;
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
    path.join(__dirname, 'templates.js'),
    `
    const { brotliDecompressSync } = require('zlib');
    const buffer = brotliDecompressSync(
      Buffer.from(
        '${buffer.toString('base64')}', 
        'base64'
      )
    );
    module.exports = JSON.parse(buffer.toString());
  `
  );
}

export function generateCompressedTemplates<
  TPage extends string = HttpServerPage
>(
  pages: Record<
    TPage,
    {
      Component: Component;
      parameters: string[];
    }
  >
): void {
  const templates = JSON.stringify(generateTemplates(pages));
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
