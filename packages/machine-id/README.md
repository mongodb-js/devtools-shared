# @mongodb-js/machine-id

[![npm](https://img.shields.io/npm/v/@mongodb-js/machine-id.svg)](https://www.npmjs.com/package/@mongodb-js/machine-id)

A native Node.js module to retrieve the unique machine ID across different operating systems.

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
const getMachineID = require('@mongodb-js/machine-id');

// Get the machine ID
const id = getMachineID();
console.log('Machine ID:', id);
```

### As a CLI

After installing globally, run:

```
machine-id
```

This will print the machine ID to the console.

## Supported Platforms

- **macOS**: Retrieves the IOPlatformUUID using the IOKit framework
- **Linux**: Support for Linux planned in future releases
- **Windows**: Support for Windows planned in future releases

## Implementation Details

The module uses native OS-specific APIs to retrieve the machine ID:

- On macOS, it uses the IOKit framework to access the IOPlatformUUID, which uniquely identifies the machine.

## Comparison with node-machine-id

This module provides similar functionality to [node-machine-id](https://www.npmjs.com/package/node-machine-id), but with:

- Simplified API focused on getting the raw machine ID
- Direct native access to system APIs without shell commands
- Optimized for use in MongoDB tools

## License

Apache-2.0
