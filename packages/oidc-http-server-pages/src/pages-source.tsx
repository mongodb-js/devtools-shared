import React from 'react';
import {
  Link,
  Icon,
  Description,
  MongoDBLogo,
  H3,
  KeylineCard,
  css,
  palette,
  spacing,
  cx,
  InlineCode,
  Body,
} from '@mongodb-js/compass-components';

const bodyStyles = css({
  position: 'absolute',
  margin: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const emptySidebarStyles = css({
  flex: '0 0 15%',
  height: '100%',
  backgroundColor: palette.green.dark2,
});

const mainViewStyles = css({
  flex: '0 0 85%',
  height: '100%',
  backgroundColor: palette.gray.light3,
});

const mainContainerStyles = css({
  padding: spacing[6],
});

const mainContentStyles = css({
  textAlign: 'center',
  padding: spacing[7],
  marginTop: spacing[5],
});

const successIconStyles = css({
  color: palette.green.dark2,
  marginBottom: spacing[3] + spacing[1],
});

const failureIconStyles = css({
  color: palette.red.base,
  marginBottom: spacing[3] + spacing[1],
});

export type OIDCPageBaseProps = {
  productDocsLink?: string;
  productName?: string;
};

function DocsLink({
  productDocsLink,
  productName,
}: OIDCPageBaseProps): JSX.Element {
  return productDocsLink ? (
    <p>
      <Link arrowAppearance="persist" href={productDocsLink}>
        {productName} Documentation
      </Link>
    </p>
  ) : (
    <></>
  );
}

function PageContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <head>
        <title>{title}</title>
      </head>
      <body className={bodyStyles}>
        <div className={emptySidebarStyles}></div>
        <div className={mainViewStyles}>
          <div className={mainContainerStyles}>
            <MongoDBLogo />
            <KeylineCard className={mainContentStyles}>{children}</KeylineCard>
          </div>
        </div>
      </body>
    </html>
  );
}

export type OIDCAcceptedPageProps = OIDCPageBaseProps;

export function OIDCAcceptedPage(props: OIDCAcceptedPageProps): JSX.Element {
  return (
    <PageContainer title="Login Successful">
      <Icon
        glyph="CheckmarkWithCircle"
        size={40}
        className={cx(successIconStyles)}
      />
      <H3>Login Successful</H3>
      <Description>You can close this window now.</Description>
      <DocsLink {...props} />
    </PageContainer>
  );
}

export type OIDCNotFoundPageProps = OIDCPageBaseProps;

export function OIDCNotFoundPage(props: OIDCNotFoundPageProps): JSX.Element {
  return (
    <PageContainer title="Page Not Found">
      <Icon glyph="XWithCircle" size={40} className={cx(failureIconStyles)} />
      <H3>Page Not Found</H3>
      <Description>This page is not available.</Description>
      <DocsLink {...props} />
    </PageContainer>
  );
}

export type OIDCErrorPageProps = {
  error?: string;
  errorDescription?: string;
  errorURI?: string;
} & OIDCPageBaseProps;

export function OIDCErrorPage({
  error,
  errorDescription,
  errorURI,
  ...baseProps
}: OIDCErrorPageProps): JSX.Element {
  return (
    <PageContainer title="Authentication Failed">
      <Icon glyph="XWithCircle" size={40} className={cx(failureIconStyles)} />
      <H3>Authentication Failed</H3>
      <Body>
        <Description>
          {baseProps.productName} could not authenticate to the MongoDB server.
        </Description>
        {error && (
          <Body>
            Error Code: <InlineCode>{error}</InlineCode>
          </Body>
        )}
        {(errorDescription || errorURI) && (
          <Description>
            {errorDescription}

            {errorURI && (
              <p>
                <Link href={errorURI}>
                  Additional information may be available here.
                </Link>
              </p>
            )}
          </Description>
        )}
      </Body>
      <DocsLink {...baseProps} />
    </PageContainer>
  );
}
