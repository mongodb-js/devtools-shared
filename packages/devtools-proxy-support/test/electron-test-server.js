'use strict';
const { app } = require('electron');
const { once } = require('events');
const { connect } = require('net');

// Essentially a REPL that we use for running Electron code.
// Communicates with a parent process via TCP and runs the code
// it receives over that socket. Input and output are NUL-delimited
// chunks of UTF-8 strings.
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
        let result;
        try {
          result = await eval(JSON.parse(readyToExecute));
        } catch (err) {
          result = { message: err.message, stack: err.stack, ...err };
        }
        // eslint-disable-next-line no-console
        console.error({ result, readyToExecute });
        socket.write(JSON.stringify(result) + '\0');
      }
    }
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();
