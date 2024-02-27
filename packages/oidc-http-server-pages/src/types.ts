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

type HttpServerPageProps = {
  [HttpServerPage.OIDCErrorPage]: OIDCErrorPageProps;
  [HttpServerPage.OIDCAcceptedPage]: OIDCAcceptedPageProps;
  [HttpServerPage.OIDCNotFoundPage]: OIDCNotFoundPageProps;
};

export const props: HttpServerPageProps = {
  [HttpServerPage.OIDCNotFoundPage]: { productDocsLink: 'abc' },
  [HttpServerPage.OIDCAcceptedPage]: { productDocsLink: 'abc' },
  [HttpServerPage.OIDCErrorPage]: { productDocsLink: 'abc' },
};

console.log({ props });

export type PageTemplates<TPage extends string = HttpServerPage> = Record<
  TPage,
  ITemplate[]
>;

// export type PageTemplates<
//   TPage extends string = HttpServerPage,
//   TPageProps extends Record<
//     string,
//     Record<symbol, string>
//   > = HttpServerPageProps
// > = {
//   [Key in keyof TPageProps]: ITemplate<TPageProps[Key]>;
// };

// export type PageTemplates = {
//   [Key in keyof HttpServerPageProps]: ITemplate<
//     HttpServerPageProps[Key]
//   >;
// };
