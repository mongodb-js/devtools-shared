/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const { oidcServerRequestHandler } = require('../dist/oidc/handler');
const { createServer } = require('http');

createServer((req, res) => {
  const params = new URL(req.url ?? '/', 'http://localhost/').searchParams;

  oidcServerRequestHandler(
    {
      productDocsLink: 'https://example.com',
      productName: 'MongoDB <Product>',
    },
    { req, res, status: 200, ...Object.fromEntries(params) }
  );
}).listen(0, function () {
  const { port } = this.address();
  const base = `http://localhost:${port}`;
  console.log('See rendered pages at these locations:');
  console.log(`${base}/?result=accepted`);
  console.log(`${base}/notfound`);
  console.log(`${base}/?result=rejected`);
  console.log(`${base}/?result=rejected&error=access_denied`);
  console.log(
    `${base}/?result=rejected&error=access_denied&errorDescription=The%20resource%20owner%20or%20authorization%20server%20denied%20the%20request`
  );
  console.log(
    `${base}/?result=rejected&error=access_denied&errorURI=https://example.com`
  );
  console.log(
    `${base}/?result=rejected&error=access_denied&errorDescription=The%20resource%20owner%20or%20authorization%20server%20denied%20the%20request&errorURI=https://example.com`
  );
});
