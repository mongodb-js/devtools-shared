'use strict';
const server = require('net')
  .createServer(() => {})
  .listen(0);
server.unref();
return server;
