import type { ITemplate, PageTemplates, HttpServerPageProps } from './types';
import getTemplates from './get-templates.js';

function findTemplate(
  templates: ITemplate[],
  parameterKeys: string[]
): ITemplate | undefined {
  const parametersJoined = parameterKeys.sort().join('-');
  for (const template of templates) {
    const templateParametersJoined = Object.keys(template.parameters)
      .sort()
      .join('-');
    if (parametersJoined === templateParametersJoined) return template;
  }
}

function replacePlaceholders(
  template: ITemplate<Record<string, string>>,
  parameters: Record<string, string>
): string {
  let { html } = template;
  for (const [key, placeholder] of Object.entries(template.parameters)) {
    html = html.replaceAll(placeholder, escapeHTML(parameters[key]));
  }
  return html;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getStaticPage<
  TPageParameters extends Record<
    string,
    Record<string, string>
  > = HttpServerPageProps,
  TPage extends string & keyof TPageParameters = string & keyof TPageParameters
>(
  page: TPage,
  parameters: TPageParameters[TPage],
  templates?: PageTemplates<TPageParameters>
): string {
  if (!templates) {
    templates = getTemplates() as PageTemplates<TPageParameters>;
  }

  const pageTemplates = templates && templates[page];
  if (!pageTemplates) {
    throw new Error(`No template found for ${page}`);
  }

  const nonEmptyParameters = Object.keys(parameters).filter(
    (key) => typeof parameters[key] !== 'undefined' && parameters !== null
  );
  const template = findTemplate(pageTemplates, nonEmptyParameters);
  if (!template) {
    throw new Error(
      `No template found for ${page}; parameters: ${Object.keys(
        parameters
      ).join(',')}. The parameters might be incorrect.`
    );
  }

  const html = replacePlaceholders(template, parameters);
  return html;
}
