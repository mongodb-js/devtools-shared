import type { RedirectServerRequestInfo } from '@mongodb-js/oidc-plugin';
import type { DevtoolsConnectOptions } from '../connect';
import {
  OIDCAcceptedPage,
  OIDCNotFoundPage,
  OIDCErrorPage,
} from '@mongodb-js/oidc-http-server-pages';

export function oidcServerRequestHandler(
  options: Pick<DevtoolsConnectOptions, 'productDocsLink' | 'productName'>,
  info: RedirectServerRequestInfo
): void {
  const { productDocsLink, productName } = options;
  const { res, result, status } = info;
  res.statusCode = status;

  if (result === 'redirecting') {
    res.setHeader('Location', info.location);
    res.end();
    return;
  }

  // This CSP is fairly restrictive. Since we are sending static pages only, the security
  // effects of this are limited, but this is also helpful for verifying that the generated
  // pages do not unintentionally rely on external resources (which they should never do).
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'unsafe-inline'"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  switch (result) {
    case 'accepted':
      res.end(OIDCAcceptedPage({ productDocsLink, productName }));
      break;
    case 'rejected':
      res.end(OIDCErrorPage({ productDocsLink, productName, ...info }));
      break;
    default:
      res.end(OIDCNotFoundPage({ productDocsLink, productName }));
      break;
  }
}
