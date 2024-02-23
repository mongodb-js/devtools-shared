// Helper script to perform static server-side rendering of the
// OIDC plugin pages. This script is run during package compilation.
//
// By generating static pages, we can avoid having all dependencies
// of this package pulling in react, react-dom, leafygreen, compass-components, etc.
//
// scripts/test-oidc-pages.js can be used to preview the generated pages.

import { renderToStaticMarkup } from 'react-dom/server';
import { renderStylesToString } from '@leafygreen-ui/emotion';
import {
  OIDCAcceptedPage,
  OIDCErrorPage,
  OIDCNotFoundPage,
} from './pages-source';
import React from 'react';
import { createHash } from 'crypto';
import { brotliCompressSync, constants as zlibConstants } from 'zlib';
import { PageTemplates, ITemplate, Page } from './types';

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

// const S = JSON.stringify; // Useful for embedding strings into real JS code.

// // Generate static pages based on a component.
// // Props need to be optional string props; for every subset of props,
// // a static page will be rendered that takes these props, and a function
// // to take that static page and replace placeholder with the actual prop values
// // will be emitted.
// // Rather than including the generated markup directly, it is saved to a global
// // table and emitted later, so that that global table can be compressed.
// function generateStaticPage(
//   Component: React.FunctionComponent<Partial<Record<string, string>>> & {
//     name: string;
//   },
//   props: string[],
//   markupTable: Record<string, string>
// ): string {
//   let result = `module.exports[${S(Component.name)}] = function(props) {
//     const actualProps = JSON.stringify(
//       Object.keys(props)
//         .filter(prop => ${S(
//           props
//         )}.includes(prop) && props[prop] != null).sort());`;
//   for (const availableProps of allSubsets(props)) {
//     const propsObject: Partial<Record<string, string>> = {};
//     const replacers: string[] = [];
//     for (const prop of availableProps) {
//       propsObject[prop] = placeholder(prop);
//       replacers.push(
//         `.replaceAll(${S(placeholder(prop))}, escapeHTML(props[${S(prop)}]))`
//       );
//     }

//     const markup = renderStylesToString(
//       renderToStaticMarkup(React.createElement(Component, propsObject))
//     );
//     const markupHash = createHash('sha256').update(markup).digest('hex');
//     markupTable[markupHash] = markup;

//     result += `if (actualProps === ${S(S(availableProps.sort()))}) {
//       return (getMarkup(${S(markupHash)})${replacers.join('')});
//     }`;
//   }

//   result += '}\n';
//   return result;
// }

// // Create CJS module with pages as exports.
// export function generateStaticPagesModule<PropNames extends string>(
//   components: [
//     React.FunctionComponent<Partial<Record<PropNames, string>>> & {
//       name: string;
//     },
//     string[]
//   ][]
// ): string {
//   let result = `
//   'use strict';
//   function escapeHTML(str) {
//     return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
//   }
//   `;
//   const markupTable: Record<string, string> = {};
//   for (const component of components) {
//     result += generateStaticPage(...component, markupTable);
//   }

//   // At the time of writing, brotli compression results in a 96% size decrease
//   // in the resulting file. We decompress the markup table lazily, so that it
//   // is not loaded into memory when OIDC is not in use.
//   const compressedMarkupTable = brotliCompressSync(S(markupTable), {
//     params: {
//       [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
//       [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
//     },
//   });
//   result += `
//   const markupTableSrc = ${S(compressedMarkupTable.toString('base64'))};
//   let markupTable;
//   function getMarkup(hash) {
//     if (markupTable === undefined) {
//       markupTable = JSON.parse(
//         require('zlib').brotliDecompressSync(
//           Buffer.from(markupTableSrc, 'base64')));
//     }
//     return markupTable[hash];
//   }
//   `;
//   return result;
// }

// if (require.main === module) {
//   // eslint-disable-next-line no-console
//   console.log(
//     generateStaticPagesModule([
//       [
//         OIDCErrorPage,
//         [
//           'error',
//           'errorDescription',
//           'errorURI',
//           'productDocsLink',
//           'productName',
//         ],
//       ],
//       [OIDCAcceptedPage, ['productDocsLink', 'productName']],
//       [OIDCNotFoundPage, ['productDocsLink', 'productName']],
//     ])
//   );
// }

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
