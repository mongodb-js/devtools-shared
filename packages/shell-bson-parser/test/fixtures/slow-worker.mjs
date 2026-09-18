self.onmessage = (event) => {
  const { id, args } = event.data;
  const [delayMs] = args;
  const start = Date.now();
  while (Date.now() - start < delayMs) {
    // noop
  }
  self.postMessage({ id, ok: true, result: 'done' });
};
