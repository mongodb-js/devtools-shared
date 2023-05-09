import path from 'path';
import findUp from 'find-up';
import fs from 'fs';
import WebpackLicensePlugin from 'webpack-license-plugin';
import type { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { sources } from 'webpack';
import {
  findAllProdDepsTreeLocations,
  findPackageLocation,
} from './production-deps';

const DEFAULT_ALLOWED_LICENSES = [
  /^MIT$/,
  /^BSD-(2-Clause|3-Clause|4-Clause)$/,
  /^Apache-2\.0$/,
  /^ISC$/,
  /^CC-BY-4\.0$/,
  /^WTFPL$/,
  /^OFL-1\.1$/,
  /^Unlicense$/,
];

const PLUGIN_NAME = 'WebpackDependenciesPlugin';

type WebpackDependenciesPluginOptions = {
  outputFilename?: string;
  includePackages?: string[];
  includeExternalProductionDependencies?: boolean;
  licenses?: {
    ignoredOrgs?: string[];
    ignoredPackages?: string[];
    outputFilename?: string;
    licenseOverrides?: Record<string, string>;
    allowedLicenses?: RegExp[];
  };
};

/**
/* `WebpackDependenciesPlugin` scans and collects all the 3rd parties dependencies that are bundled,
/* optionally adding also the production dependencies of the package (found recursively inside the node_modules).
*/
export class WebpackDependenciesPlugin implements WebpackPluginInstance {
  private readonly pluginName = PLUGIN_NAME;
  outputPath: string;
  licensePlugin: WebpackLicensePlugin;
  includePackages: string[] = [];

  constructor(private options: WebpackDependenciesPluginOptions = {}) {
    this.includePackages = [
      ...(options.includeExternalProductionDependencies
        ? findAllProdDepsTreeLocations()
        : []),
      ...(options.includePackages || []).map(findPackageLocation),
    ];

    this.outputPath = options.outputFilename || 'dependencies.json';

    const licensePluginOptions = {
      outputFilename: options?.licenses?.outputFilename,
      excludedPackageTest: (packageName: string, version: string) => {
        return (
          (options.licenses?.ignoredOrgs || []).some((org) =>
            packageName.startsWith(org + '/')
          ) ||
          (options.licenses?.ignoredPackages || []).includes(
            `${packageName}@${version}`
          )
        );
      },
      licenseOverrides: options.licenses?.licenseOverrides || {},
      unacceptableLicenseTest: (licenseIdentifier: string) => {
        const allowedLicenses =
          options.licenses?.allowedLicenses || DEFAULT_ALLOWED_LICENSES;
        return !allowedLicenses.some((regex) => regex.test(licenseIdentifier));
      },

      includePackages: () => [...this.includePackages],
    };

    this.licensePlugin = new WebpackLicensePlugin(licensePluginOptions);
  }

  private readPackageMeta = async (packageJsonPath: string) => {
    const { name, version } = JSON.parse(
      await fs.promises.readFile(packageJsonPath, 'utf-8')
    );

    return {
      name,
      version,
    };
  };

  private handleTap = async (compilation: Compilation) => {
    const modules = compilation.modules;
    const dependencies = new Set<string>();

    modules.forEach((module) => {
      const resource = (module as unknown as any).resource;
      if (resource) {
        const modulePath = resource;
        if (typeof modulePath === 'string') {
          const packageJsonPath = findUp.sync('package.json', {
            cwd: path.dirname(modulePath),
          });

          if (packageJsonPath) {
            dependencies.add(packageJsonPath);
          }
        }
      }
    });

    this.includePackages.forEach((includedPackagePath) => {
      const packageJsonPath = path.join(includedPackagePath, 'package.json');

      if (packageJsonPath) {
        dependencies.add(packageJsonPath);
      }
    });

    const dependencyList = await Promise.all(
      Array.from(dependencies).map((dep) => this.readPackageMeta(dep))
    );

    dependencyList.sort((a, b) => {
      return a.name > b.name ? 1 : -1;
    });

    const assetSource = JSON.stringify(dependencyList, null, 2);

    compilation.emitAsset(this.outputPath, new sources.RawSource(assetSource));
  };

  apply(compiler: Compiler): void {
    this.licensePlugin.apply(compiler as any);

    compiler.hooks.emit.tapPromise(PLUGIN_NAME, this.handleTap);
  }
}

export default WebpackDependenciesPlugin;
