# @mongodb-js/connection-string-policy

Checks a MongoDB connection string against a policy list of options, and reports the ones
that fall outside it.

Use it when a connection string comes from somewhere other than the user: a deep link, a
protocol handler, a command line argument, or a tool call. Some options change where
credentials are sent, and some disable TLS certificate verification, so connecting with one
of those without asking the user first is a risk.

The check looks at the connection string and nothing else. It reports whether the string is
safe to connect with without asking the user, and which of its options are not. It does not
tell you whether the connection string is well-formed, whether connecting will succeed, or
anything about what happens once the connection is established. It also does not decide what
to do next: it returns data, never throws for policy reasons, and does no logging or
prompting.

## Usage

```ts
import { checkConnectionStringPolicy } from '@mongodb-js/connection-string-policy';

const result = checkConnectionStringPolicy(connectionString);

if (!result.withinPolicy) {
  console.log(result.flaggedOptions);
}
```

## What you get back

| Field            | Meaning                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `withinPolicy`   | `true` when nothing was flagged.                                            |
| `flaggedOptions` | Names of the options that fall outside the policy list.                     |
| `unparseable`    | `true` when the connection string could not be parsed; never within policy. |

`flaggedOptions` contains option names only, never values, so it is safe to display or log
without redacting it first. Two kinds of entry are not literal option names:

- `'ssl/tls'` — the connection would not be TLS-protected (a non-SRV string to a non-local
  host without `tls=true`, or an SRV string that sets `tls=false`).
- `'authMechanismProperties.<NAME>'` — an individual auth mechanism property.

## How the lists work

Every connection string option known to the Node.js driver is listed as either allowed or
disallowed, and two type-level functions make TypeScript fail to compile if an option
appears in neither. That is deliberate: a new driver option being silently treated as
acceptable is worse than the cost of maintaining the list, so a driver upgrade that adds an
option is _supposed_ to break the build here.

At runtime the check is an allow list — anything not explicitly allowed is flagged. The
disallowed list is not consulted directly; it documents intent and feeds the exhaustiveness
check. A test asserts the two lists never overlap.

Because that check is only meaningful against one set of driver typings, this package
declares its `mongodb` peer dependency on a single major version.
