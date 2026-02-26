# Devtools Shared Monorepo

This repository contains packages that are shared dependencies of Compass, the MongoDB extension for VSCode and MongoSH.

## Package Manager Configuration

By default, this repository uses `npm` for package management. You can optionally use `pnpm` instead by setting the `MONOREPO_TOOLS_USE_PNPM` environment variable:

```bash
export MONOREPO_TOOLS_USE_PNPM=true
```

When `MONOREPO_TOOLS_USE_PNPM=true`, all monorepo tools scripts will use `pnpm` instead of `npm` and `pnpm dlx` instead of `npx`.

## Getting Started

To start working:

```
npm run bootstrap
```


Lint code and dependencies

```
npm run check
```

Run tests

```
npm run test
```

To create a new workspace:

```
npm run create-workspace
```

## Contributing

For contributing, please refer to [CONTRIBUTING.md](CONTRIBUTING.md)
