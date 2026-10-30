# Change Log

All notable changes to `@mongodb-js/mongodb-runner` are documented in this file.

## [Unreleased]

### Changed

- With `--logDir` / `logDir`, servers now write their logs directly to the log file instead of through
  a pipe to the runner process, so logs are still written after `mongodb-runner start` exits.
- Server log files are now named `<binary>-<uuid>-<timestamp>.log` instead of
  `<binary>-<pid>-<timestamp>.log`.

### Fixed

- Server logs no longer stop at the moment `mongodb-runner start` returns.
- Server output that is not a log entry no longer ends startup log parsing.
