# @mongodb-js/machine-id

> Native implementation for retrieving unique machine ID without admin privileges or child processes for desktop platforms. Faster and more reliable alternative to node-machine-id.

## Installation

```
npm install @mongodb-js/machine-id
```

Or use it directly in the CLI

```
npx @mongodb-js/machine-id
```

## Usage

### As a module

```javascript
import { getMachineID } from '@mongodb-js/machine-id';

// Get the machine ID
const hashedId = getMachineID();
console.log('SHA-256 Hashed Machine ID:', id);
const id = getMachineID({ raw: true });
console.log('Original Machine ID:', id);
```


## Supported Platforms

- **macOS**: Uses the `IOPlatformUUID` from the `IOKit` framework (Supported on macOS 12.0 and later).
- **Linux**: Uses the `/var/lib/dbus/machine-id` file to retrieve the machine ID. If this file does not exist, it falls back to `/etc/machine-id`.
- **Windows**: Uses the `MachineGuid` from the `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography` registry.

## Comparison with `node-machine-id`

This module provides similar functionality to [node-machine-id](https://www.npmjs.com/package/node-machine-id), but **using native access to system APIs without the need for child processes**, making it much faster and reliable.

Here's a table of performance comparisons between the two libraries, based on the average runtime from 1000 iterations of the `getMachineId` and `machineIdSync` functions, from `scripts/benchmark.ts`:

| Test        | node-machine-id | @mongodb-js/machine-id | Improvement |
| ----------- | --------------- | ---------------------- | ----------- |
| **Mac**     |
| Raw      | 10.71ms          | 0.0072ms              | 1494x        |
| Hashed   | 12.42ms          | 0.0176ms                 | 707x        |
| **Linux**   |
| Raw         | 3.26ms      | 0.0059ms               | 557x        |
| Hashed      | 3.25ms        | 0.0088ms                 | 368x        |
| **Windows** |
| Raw         | 45.36ms*          | 0.0122ms               | 3704x        |
| Hashed      | 28.66ms*          | 0.0272ms                 | 1053x        |

\* - Windows tests may be inaccurate due to potential caching. 


### Migrating from `node-machine-id`
If you were previously using `node-machine-id`, you can use the following mapping to get a result with the following hashing transformation. This is not guaranteed always to 1:1 match the output of `node-machine-id` for all cases. For example on Linux, it falls back to `/etc/machine-id` if `/var/lib/dbus/machine-id` is not available.

```ts
import { createHash } from 'crypto';
import { getMachineId } from '@mongodb-js/machine-id';

function machineIdSync(original: boolean): string | undefined {
  const rawMachineId = getMachineId({ raw: true }).toLowerCase();

  return original ? rawMachineId : createHash('sha256').update(rawMachineId).digest('hex');
}
```

## License

Apache-2.0
