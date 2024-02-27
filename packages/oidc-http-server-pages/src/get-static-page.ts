import type { ITemplate, HttpServerPage, PageTemplates } from './types';

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
  template: ITemplate,
  parameters: Record<string, string | undefined>
): string {
  let { html } = template;
  for (const [key, placeholder] of Object.entries(template.parameters)) {
    html = html.replaceAll(placeholder, escapeHTML(parameters[key] as string));
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

export function getStaticPage<TPage extends string = HttpServerPage>(
  page: TPage,
  parameters: Record<string, string | undefined>,
  templates?: PageTemplates<TPage>
): string {
  if (!templates) {
    templates = require('./templates.js');
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
