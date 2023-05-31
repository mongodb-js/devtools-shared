import path from 'path';
import { promises as fs } from 'fs';
import type { Compiler, WebpackPluginInstance } from 'webpack';
import _ from 'lodash';

import errorStackParser from 'error-stack-parser';

import {
  findAllProdDepsTreeLocations,
  findPackageLocation,
} from './production-deps';
import { getPackageInfo } from './get-package-info';

const PLUGIN_NAME = 'WebpackDependenciesPlugin';

export type WebpackDependenciesPluginOptions = {
  outputFilename?: string;
  includePackages?: string[];
  includeExternalProductionDependencies?: boolean;
};

/**
/* `WebpackDependenciesPlugin` scans and collects all the 3rd parties dependencies that are bundled,
/* optionally adding also the production and optional dependencies of the package (found recursively inside the node_modules).
*/
export class WebpackDependenciesPlugin implements WebpackPluginInstance {
  private readonly pluginName = PLUGIN_NAME;
  outputPath?: string;
  resolvedModules = new Set<string>();
  includeExternalProductionDependencies: boolean;
  includePackages: string[] = [];

  constructor(private options: WebpackDependenciesPluginOptions = {}) {
    this.includeExternalProductionDependencies =
      options.includeExternalProductionDependencies ?? false;
    this.includePackages = options.includePackages ?? [];
    this.outputPath = options.outputFilename;
  }

  private isThirdPartyModule(modulePath: string) {
    return modulePath.split(path.sep).includes('node_modules');
  }

  private getWebpackModulePath(error: Error) {
    const stack = errorStackParser.parse(error);

    const webpackEntry = stack.find((entry) =>
      entry.fileName
        ?.split(path.win32.sep)
        .join(path.posix.sep)
        .includes('node_modules/webpack')
    );

    return webpackEntry?.fileName;
  }

  private addIncludedPackages(compiler: Compiler) {
    const includePackages = [
      ...(this.includeExternalProductionDependencies
        ? findAllProdDepsTreeLocations(compiler.context)
        : []),
      ...(this.includePackages || []).map((packageName) =>
        findPackageLocation(packageName, compiler.context)
      ),
    ];

    for (const includedPackagePath of includePackages) {
      const packageJsonPath = path.join(includedPackagePath, 'package.json');

      if (packageJsonPath) {
        this.resolvedModules.add(packageJsonPath);
      }
    }
  }

  apply(compiler: Compiler): void {
    const webpackModulePath = this.getWebpackModulePath(new Error());

    this.addIncludedPackages(compiler);

    compiler.hooks.done.tapAsync(PLUGIN_NAME, (stats, done) => {
      const { modules } = stats.toJson();

      modules?.forEach(({ type, nameForCondition }) => {
        if (
          type === 'module' &&
          nameForCondition &&
          this.isThirdPartyModule(nameForCondition)
        ) {
          this.resolvedModules.add(nameForCondition);
        }
      });

      if (
        modules?.find(
          (m) =>
            m.moduleType === 'runtime' && m.name?.startsWith('webpack/runtime')
        ) &&
        webpackModulePath
      ) {
        this.resolvedModules.add(webpackModulePath);
      }

      done();
    });

    compiler.hooks.shutdown.tapPromise(PLUGIN_NAME, async () => {
      const dependencyList = await Promise.all(
        Array.from(this.resolvedModules).map(getPackageInfo)
      );

      const uniqueList = _.uniqBy(
        dependencyList,
        ({ name, version }) => `${name}@${version}`
      );

      const sortedList = _.sortBy(
        uniqueList,
        ({ name, version }) => `${name}@${version}`
      );

      const outputPath =
        this.outputPath ?? path.join(compiler.context, 'dependencies.json');

      await fs.mkdir(path.dirname(path.resolve(outputPath)), {
        recursive: true,
      });

      await fs.writeFile(outputPath, JSON.stringify(sortedList, null, 2));
    });
  }
}

export default WebpackDependenciesPlugin;
