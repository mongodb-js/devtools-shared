# @mongodb-js/device-id

Create a consistent, implementation-agnostic hash from a given raw machine ID. The machine ID should originate from `node-machine-id` or `native-machine-id` depending on the platform. The hash is generated using SHA-256 and is designed to be consistent with the Atlas CLI.
