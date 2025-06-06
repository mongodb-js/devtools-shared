# @mongodb-js/device-id

Creates a consistent, implementation-agnostic hash from a given raw machine ID resolution function. The machine ID resolution function should come from `node-machine-id` or `native-machine-id` depending on the platform. The hash is generated using SHA-256 and is designed to be consistent with the Atlas CLI.
