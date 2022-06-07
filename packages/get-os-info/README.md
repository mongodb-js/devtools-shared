# get-os-info

Returns info about the host os

```js
const info = await getOsInfo();
```

Example output:

```js
{
  os_type: 'Darwin',
  os_version: 'Darwin Kernel Version 21.4.0: Fri Mar 18 00:45:05 PDT 2022; root:xnu-8020.101.4~15/RELEASE_X86_64',
  os_release: '21.4.0',
  os_arch: 'x64',
  // only on linux:
  os_linux_dist: 'ubuntu' ,
  os_linux_release: '20.04',
}
```
