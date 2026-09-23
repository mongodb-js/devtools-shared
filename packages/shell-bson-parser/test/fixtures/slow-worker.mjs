// Avoiding the import of these two functions,
// adding them here to keep this file self-contained
function unmarkBSON(value) {
  return value.data;
}
function markBSON(value) {
  return { data: value, bsonTypes: new Map() };
}
self.onmessage = (event) => {
  const { id, args } = event.data;
  const [delayMs] = unmarkBSON(args);
  const start = Date.now();
  while (Date.now() - start < delayMs) {
    // noop
  }
  self.postMessage({
    id,
    ok: true,
    result: markBSON('done'),
  });
};
