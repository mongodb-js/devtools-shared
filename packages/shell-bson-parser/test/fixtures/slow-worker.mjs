// Avoiding the import of these two functions,
// adding them here to keep this file self-contained
function untrackBSON(value) {
  return value.data;
}
function trackBSON(value) {
  return { data: value, bsonTypes: new Map() };
}
self.onmessage = (event) => {
  const { id, args } = event.data;
  const [delayMs] = untrackBSON(args);
  const start = Date.now();
  while (Date.now() - start < delayMs) {
    // noop
  }
  self.postMessage({
    id,
    ok: true,
    result: trackBSON('done'),
  });
};
