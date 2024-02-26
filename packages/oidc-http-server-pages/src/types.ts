export interface ITemplate {
  parameters: Record<string, string>;
  html: string;
}
export type PageTemplates<TPage extends string = HttpServerPage> = Record<
  TPage,
  ITemplate[]
>;

export enum HttpServerPage {
  OIDCErrorPage = 'OIDCErrorPage',
  OIDCAcceptedPage = 'OIDCAcceptedPage',
  OIDCNotFoundPage = 'OIDCNotFoundPage',
}
