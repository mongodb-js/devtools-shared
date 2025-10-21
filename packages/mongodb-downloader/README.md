## mongodb-downloader

A simple library to download MongoDB binaries for different platforms and versions.

### Migrating from v0.4 to v0.5

In v0.5.x, the library introduced lockfiles to prevent parallel downloads of the same MongoDB binary. It also changed the arguments for the `downloadMongoDb` and `downloadMongoDbWithVersionInfo` functions, introducing a new `useLockfile` field and using a single options object instead of separate parameters for different options. It is recommended to enable lockfiles to prevent redundant downloads unless you have a specific reason not to.

```ts
// Before (v0.4.x)
downloadMongoDb('/tmp/directory', '4.4.6', {
  platform: 'linux',
  arch: 'x64',
});

downloadMongoDbWithVersionInfo('/tmp/directory', '4.4.6', {
  arch: 'x64',
});

// After (v0.5.x)
downloadMongoDb({
  directory: '/tmp/directory',
  version: '4.4.6',
  useLockfile: true, // New, required field.
  downloadOptions: {
    platform: 'linux',
    arch: 'x64',
  },
});

downloadMongoDbWithVersionInfo({
  directory: '/tmp/directory',
  version: '4.4.6',
  useLockfile: true, // New, required field.
  downloadOptions: {
    arch: 'x64',
  },
});
```
