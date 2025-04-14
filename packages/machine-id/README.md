# @mongodb-js/machine-id

> Cross-platform module to retrieve unique machine IDs across desktop operating systems without admin privileges or child processes.

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

### As a CLI

After installing globally, run:

```
machine-id
```

This will print the machine ID to the console.

## Comparison with `node-machine-id`

This module provides similar functionality to [node-machine-id](https://www.npmjs.com/package/node-machine-id), but **using native access to system APIs without the need for child processes**.

If you were previously using `node-machine-id`, you can use the following mapping to get a result that uses the same hashing transformation. This helps create more consistent results as before but it is not guaranteed to be the same for all cases.

```ts
import { createHash } from 'crypto';
import { getMachineId } from '@mongodb-js/machine-id';

function machineIdSync(original: boolean): string | undefined {
  const rawMachineId = getMachineId({ raw: true }).toLowerCase();

  if (original) {
    return rawMachineId;
  }

  return createHash('sha256').update(rawMachineId).digest('hex');
}
```

## Supported Platforms

- **macOS**: Uses the `IOPlatformUUID` from the `IOKit` framework (Supported on macOS 12.0 and later).
- **Linux**: Uses the `/etc/machine-id` file to retrieve the machine ID. If this file does not exist, it falls back to `/var/lib/dbus/machine-id`.
- **Windows**: Uses the `MachineGuid` from the `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography` registry.

## License

Apache-2.0
