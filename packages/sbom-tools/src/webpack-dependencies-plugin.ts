import path from 'path';
import { promises as fs } from 'fs';
import type { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import _ from 'lodash';

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

  private handleTap = (compilation: Compilation) => {
    for (const module of compilation.modules) {
      const resource = (module as unknown as any).resource;
      if (resource) {
        const modulePath = resource;
        if (
          typeof modulePath === 'string' &&
          this.isThirdPartyModule(modulePath)
        ) {
          this.resolvedModules.add(modulePath);
        }
      }
    }

    const includePackages = [
      ...(this.includeExternalProductionDependencies
        ? findAllProdDepsTreeLocations(compilation.compiler.context)
        : []),
      ...(this.includePackages || []).map((packageName) =>
        findPackageLocation(packageName, compilation.compiler.context)
      ),
    ];

    for (const includedPackagePath of includePackages) {
      const packageJsonPath = path.join(includedPackagePath, 'package.json');

      if (packageJsonPath) {
        this.resolvedModules.add(packageJsonPath);
      }
    }
  };

  apply(compiler: Compiler): void {
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

    compiler.hooks.emit.tap(PLUGIN_NAME, this.handleTap);
  }
}

export default WebpackDependenciesPlugin;
