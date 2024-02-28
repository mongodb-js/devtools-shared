import type {
  OIDCAcceptedPageProps,
  OIDCErrorPageProps,
  OIDCNotFoundPageProps,
} from './pages-source';
export interface ITemplate<
  TParameters extends Record<string, string> = Record<string, string>
> {
  parameters: TParameters;
  html: string;
}

export enum HttpServerPage {
  OIDCErrorPage = 'OIDCErrorPage',
  OIDCAcceptedPage = 'OIDCAcceptedPage',
  OIDCNotFoundPage = 'OIDCNotFoundPage',
}

export type HttpServerPageProps = {
  [HttpServerPage.OIDCErrorPage]: OIDCErrorPageProps;
  [HttpServerPage.OIDCAcceptedPage]: OIDCAcceptedPageProps;
  [HttpServerPage.OIDCNotFoundPage]: OIDCNotFoundPageProps;
};

export type PageTemplates<
  TPageProps extends Record<
    string,
    Record<string, string>
  > = HttpServerPageProps
> = {
  [Key in keyof TPageProps]: ITemplate<TPageProps[Key]>[];
};
