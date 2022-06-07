# Contributing

## Workflow

MongoDB welcomes community contributions! If you’re interested in making a contribution to this repo, please follow the steps below before you start writing any code:

1. Sign the [contributor's agreement](http://www.mongodb.com/contributor). This will allow us to review and accept contributions.
1. Fork the repository on GitHub
1. Create a branch with a name that briefly describes your feature
1. Implement your feature or bug fix
1. Add new cases to the relevant `./<package>/tests` folder that verify your bug fix or make sure no one unintentionally breaks your feature in the future and run them with `npm test`
1. Add comments around your new code that explain what's happening
1. Commit and push your changes to your branch then submit a pull request

## Bugs

You can report new bugs by [creating a new issue](https://jira.mongodb.org/browse/COMPASS/). Please include as much information as possible about your environment.

## VSCode Setup

This repository includes a few recommended plugins for your convenience:

- Prettier extension helps to format your code following this repository code style.
  > ⚠️&nbsp;&nbsp;If you install the [Prettier VSCode extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) please make sure to set the `prettier.requireConfig` option for the workspace! This will ensure only packages that have `prettier` enabled will get formatted.
- ESLint extension highlights possible issues in your code following our common eslint configuration.
- ANTLR4 grammar support extension helps to work with the `bson-transpilers` package that is implemented with the help of antlr (.g and .g4 files).

## Working With the Monorepo

You'll need node `^14.17.5` and npm `7` installed on your machine to work with the repository locally. After your environment is ready, navigate to the repository and run `npm run bootstrap`, this will install dependencies and will compile all packages.

After bootstrap is finished, you should be able to run `npm run start` and see Compass application running locally.

This monorepo is powered by [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces) and [`lerna`](https://github.com/lerna/lerna#readme), although not necessary, it might be helpful to have a high level understanding of those tools.

### Add / Update / Remove Dependencies in Packages

To add, remove, or update a dependency in any workspace you can use the usual `npm install` with a `--workspace` argument added, e.g. to add `react-aria` dependency to compass-aggregations and compass-query-bar plugins you can run `npm install --save react-aria --workspace @mongodb-js/compass-aggregations --workspace @mongodb-js/compass-query-bar`.

Additionally if you want to update a version of an existing dependency, but don't want to figure out the scope manually, you can use `npm run where` helper script. To update `webpack` in every package that has it as a dev dependency you can run `npm run where "devDependencies['webpack']" -- install --save-dev webpack@latest`

### Creating a New Workspace / Package

To create a new package please use the `create-workspace` npm script:

```sh
npm run create-workspace [workspace name]
```

This will do all the initial workspace bootstrapping for you, ensuring that your package has all the standard configs set up and ready, and all the npm scripts aligned with other packages in the monorepo, which is important to get the most out of all the provided helpers in this repository (like `npm run check-changed` commands or to make sure that your tests will not immediately fail in CI because of the test timeout being too small)
