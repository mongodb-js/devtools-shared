# @mongodb-js/oidc-mock-provider

This is a package for internal testing. It should not be considered
production-ready or used in deployed applications.

This OIDC provider does not provide any form of genuine authentication
or authorization functionality.

## Requirements

Node.js >= 20.19.5, npm >= 11.6.0. Running as
`npx @mongodb-js/oidc-mock-provider ...` is typically the easiest way
to install/run this tool.

## CLI Options

The OIDC Mock Provider can be configured using the following command-line options:

| Option                 | Alias | Type    | Description                                                                   | Default              |
| ---------------------- | ----- | ------- | ----------------------------------------------------------------------------- | -------------------- |
| `--port`               | `-p`  | string  | Port to run the server on. Setting to `0` auto-assigns a random port.         | `0` or `defaultPort` |
| `--host`               | `-h`  | string  | Hostname for the server to listen upon.                                       | `localhost`          |
| `--bind_ip_all`        |       | boolean | Bind to all IPv4 and IPv6 addresses.                                          | `false`              |
| `--payload`            | `-P`  | string  | JSON payload to be returned to the client.                                    |                      |
| `--expiry`             | `-e`  | number  | Expiry time for the token in seconds.                                         | `3600`               |
| `--id-payload`         | `-i`  | string  | Custom JSON payload for ID tokens.                                            |                      |
| `--skip-id-token`      |       | boolean | Skip issuing ID tokens.                                                       |                      |
| `--skip-refresh-token` |       | boolean | Skip issuing refresh tokens.                                                  |                      |
| `--log-requests`       | `-l`  | boolean | Log all incoming HTTP requests to the console.                                | `true`               |
| `--issuer-metadata`    | `-I`  | string  | Additional issuer metadata as JSON to include in the OIDC discovery document. | `{}`                 |

The default token payload description is:

```js
{
  groups: ['testgroup'],
  sub: 'testuser',
  aud: 'resource-server-audience-value',
}
```

## Examples

Start the OIDC mock identity provider server on port 28200:

```sh
npx @mongodb-js/oidc-mock-provider -p 28200
```

Start the server on a random port and bind to all interfaces:

```sh
npx @mongodb-js/oidc-mock-provider --port 0 --bind_ip_all
```

Return a custom JSON payload and set token expiry to 10 minutes:

```sh
npx @mongodb-js/oidc-mock-provider -P '{"sub":"user123"}' -e 600
```

Log all HTTP requests and provide additional issuer metadata:

```sh
npx @mongodb-js/oidc-mock-provider -l --issuer-metadata '{"custom":"value"}'
```

For more options, run:

```sh
npx @mongodb-js/oidc-mock-provider --help
```
