'use strict';
const { app } = require('electron');
const { once } = require('events');
const { connect } = require('net');
(async function () {
  try {
    await app.whenReady();
    const socket = connect(+process.env.TEST_SERVER_PORT);
    await once(socket, 'connect');
    socket.setEncoding('utf8');
    let buffer = '';
    for await (const chunk of socket) {
      buffer += chunk;
      while (buffer.includes('\0')) {
        const readyToExecute = buffer.substring(0, buffer.indexOf('\0'));
        buffer = buffer.substring(buffer.indexOf('\0') + 1);
        const result = JSON.stringify(await eval(JSON.parse(readyToExecute)));
        socket.write(result + '\0');
      }
    }
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();
