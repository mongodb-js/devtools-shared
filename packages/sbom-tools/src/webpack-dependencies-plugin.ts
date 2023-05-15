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

type WebpackDependenciesPluginOptions = {
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
  outputPath: string;
  includePackages: string[] = [];
  resolvedModules = new Set<string>();

  constructor(private options: WebpackDependenciesPluginOptions = {}) {
    this.includePackages = [
      ...(options.includeExternalProductionDependencies
        ? findAllProdDepsTreeLocations()
        : []),
      ...(options.includePackages || []).map(findPackageLocation),
    ];

    this.outputPath = options.outputFilename || 'dependencies.json';
  }

  private handleTap = (compilation: Compilation) => {
    for (const module of compilation.modules) {
      const resource = (module as unknown as any).resource;
      if (resource) {
        const modulePath = resource;
        if (typeof modulePath === 'string') {
          this.resolvedModules.add(modulePath);
        }
      }
    }

    for (const includedPackagePath of this.includePackages) {
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

      await fs.mkdir(path.dirname(path.resolve(this.outputPath)), {
        recursive: true,
      });

      await fs.writeFile(this.outputPath, JSON.stringify(sortedList, null, 2));
    });

    compiler.hooks.emit.tap(PLUGIN_NAME, this.handleTap);
  }
}

export default WebpackDependenciesPlugin;
