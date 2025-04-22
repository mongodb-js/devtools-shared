# native-machine-id

> Native retrieval of a unique desktop machine ID without admin privileges or child processes. Faster and more reliable alternative to node-machine-id.

## Installation

```
npm install native-machine-id
```

Or use it directly in the CLI

```
npx native-machine-id
npx native-machine-id --raw
```

## Usage

### As a module

```javascript
import { getMachineId } from 'native-machine-id';

// Get the machine ID, hashed with SHA-256
const hashedId = getMachineId();
console.log('Hashed Machine ID:', hashedId);

// Get the raw machine ID (should not be exposed in untrusted environments)
const rawId = getMachineId({ raw: true });
console.log('Original Machine ID:', rawId);

// Or synchronously
import { getMachineIdSync } from 'native-machine-id';
const id = getMachineIdSync();
```

## Supported Platforms

- **macOS**: Uses the `IOPlatformUUID` from the `IOKit` framework.
- **Linux**: Uses the `/var/lib/dbus/machine-id` file to retrieve the machine ID. If this file does not exist, it falls back to `/etc/machine-id`.
- **Windows**: Uses the `MachineGuid` from the `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography` registry.

## Comparison with `node-machine-id`

This module provides similar functionality to [node-machine-id](https://www.npmjs.com/package/node-machine-id) while **using native access to system APIs without the need for child processes**, making it much faster and reliable.

Here's a table of performance comparisons between the two libraries, based on the average runtime from 1000 iterations of the `getMachineIdSync` and `machineIdSync` functions, from `scripts/benchmark.ts`:

| Test        | node-machine-id | native-machine-id | Improvement |
| ----------- | --------------- | ----------------- | ----------- |
| **Mac**     |
| Raw         | 10.71ms         | 0.0072ms          | 1494x       |
| Hashed      | 12.42ms         | 0.0176ms          | 707x        |
| **Linux**   |
| Raw         | 3.26ms          | 0.0059ms          | 557x        |
| Hashed      | 3.25ms          | 0.0088ms          | 368x        |
| **Windows** |
| Raw         | 45.36ms\*       | 0.0122ms          | 3704x       |
| Hashed      | 28.66ms\*       | 0.0272ms          | 1053x       |

\* - Windows tests may be inaccurate due to potential caching.

### Migrating from `node-machine-id`

If you were previously using `node-machine-id`, you can use the following mapping to get a result with the following hashing transformation. This is not guaranteed always to 1:1 match the output of `node-machine-id` for all cases. For example on Linux, it falls back to `/etc/machine-id` if `/var/lib/dbus/machine-id` is not available.

```ts
import { createHash } from 'crypto';
import { getMachineIdSync } from 'native-machine-id';

function machineIdSync(original: boolean): string | undefined {
  const rawMachineId = getMachineIdSync({ raw: true }).toLowerCase();

  return original
    ? rawMachineId
    : createHash('sha256').update(rawMachineId).digest('hex');
}
```

## Credits

Influenced by the work from [denisbrodbeck/machineid](https://github.com/denisbrodbeck/machineid) and [automation-stack/node-machine-id](https://github.com/automation-stack/node-machine-id).

## License

Apache-2.0
