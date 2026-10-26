// Avoiding the import of these two functions,
// adding them here to keep this file self-contained
const { parentPort } = require('worker_threads');

function untrackBSON(value) {
  return value.data;
}
function trackBSON(value) {
  return { data: value, bsonTypes: new Map() };
}
parentPort.on('message', ({ id, args }) => {
  const [delayMs] = untrackBSON(args);
  const start = Date.now();
  while (Date.now() - start < delayMs) {
    // noop
  }
  parentPort.postMessage({
    id,
    ok: true,
    result: trackBSON('done'),
  });
});
