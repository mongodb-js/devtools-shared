export interface ITemplate {
  parameters: Record<string, string>;
  html: string;
}
export type PageTemplates = Record<Page, ITemplate[]>;

export enum Page {
  OIDCErrorPage = 'OIDCErrorPage',
  OIDCAcceptedPage = 'OIDCAcceptedPage',
  OIDCNotFoundPage = 'OIDCNotFoundPage',
}
