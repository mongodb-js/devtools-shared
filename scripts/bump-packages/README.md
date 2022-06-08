# Bump Packages Task

Bump the version of changed packages according to their commit history since the last commit with a special subject (`chore(ci): bump packages`).

**NOTE:** this script will only write changes to the disk: it will not commit, push or release any package.

## Usage

Run this in CI in order to update the packages `package.json` and the root `package-lock.json`:

```
node scripts/bump-packages/bump-packages.js
```

## What it does

The command performs the following steps:

1. Find the _"last bump commit"_ in the branch, the one which subject starts with `chore(ci): bump packages`
2. Gets a list of all the packages in the monorepo sorted in topological order of dependencies, eg: `{ "name": "pkg1", "dependencies": {"pkg2": "1.0.0"}` -> `["pkg2", "pkg1"]`
3. For each package in the list:

- Calculatew the _"conventional bump"_ according to commits in the package since the _"last bump commit"_
- Aligns all the dependencies previously bumped during the traversal of the list and calculate the _"dependencies bump"_.
- Bump the package version with the maximum increment between the _"conventional bump"_ and the _"dependencies bump"_.

### Conventional Bump

The "conventional bump" calculate a bump based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) to the package as follows:

- if any commit on a package has subject or body containing `BREAKING CHANGE` or `BREAKING CHANGES` or has a `!` after the type/scope in the subject (ie. `feat!: ...` or `feat(somescope)!: ...`) then the package will be bumped to the next **major** version.

- if any commit on a package has subject starting with `feat` or `fix` then the package will be bumped to the next **minor** version.

- if any commit on a package exists the package will be bumped to the next **patch** version.

### Dependencies Bump

A package version is bumped also when any dependencies version is bumped. The version change in this case is calculated as follows:

- when only `devDependencies` changed then the package will be bumped to the next **patch** version.
- when any other type of dependency changed (`dependencies`, `peerDependencies`, `optionalDependencies`), then the package will receive the same bump of its dependencies, picking the maximum if more than a dependency was changed.
