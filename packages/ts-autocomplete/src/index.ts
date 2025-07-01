/* eslint-disable no-console */
import _ from 'lodash';
import * as ts from 'typescript';
import createDebug from 'debug';

const debugLog = createDebug('ts-autocomplete:log');
const debugTrace = createDebug('ts-autocomplete:trace');
const debugError = createDebug('ts-autocomplete:error');

type TypeFilename = string;

type UpdateDefinitionFunction = (newDef: Record<TypeFilename, string>) => void;

// TODO
/*
function createIOError(code: string, details = ""): NodeJS.ErrnoException {
    const err: NodeJS.ErrnoException = new Error(`${code} ${details}`);
    err.code = code;
    if (Error.captureStackTrace) Error.captureStackTrace(err, createIOError);
    return err;
}
    */
function relativeNodePath(fileName: string): string {
  //console.log(fileName);
  const parts = fileName.split(/\/node_modules\//g);
  if (parts.length === 1 && fileName.endsWith('package.json')) {
    // special case: when it looks up this package itself it isn't going to find
    // it in node_modules
    return '@mongodb-js/mongodb-ts-autocomplete/package.json';
  }
  return parts[parts.length - 1];
}

type EncounteredPaths = {
  getScriptSnapshot: string[];
  fileExists: string[];
  readFile: string[];
  //readDirectory: string[],
  //directoryExists: string[],
  //getDirectories: string[]
};

function getVirtualLanguageService(): {
  languageService: ts.LanguageService;
  updateCode: UpdateDefinitionFunction;
  listFiles: () => string[];
  listEncounteredPaths: () => EncounteredPaths;
} {
  // as an optimization, the contents of a file can be string or true. This is
  // because some files are only checked for existence during module resolution,
  // but never loaded. In that case the contents is true, not a string.
  const codeHolder: Record<TypeFilename, string | true> = Object.create(null);
  const versions: Record<TypeFilename, number> = Object.create(null);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
    lib: ['es2023'],
    allowImportingTsExtensions: true,
  };

  const updateCode = (newDef: Record<TypeFilename, string>): void => {
    for (const [key, value] of Object.entries(newDef)) {
      codeHolder[key] = value;
      versions[key] = (versions[key] ?? 0) + 1;
    }
  };

  const listFiles = (): string[] => {
    return Object.keys(codeHolder);
  };

  const encounteredPaths: EncounteredPaths = {
    getScriptSnapshot: [],
    fileExists: [],
    readFile: [],
    //readDirectory: [], // unused
    //directoryExists: [], // unused
    //getDirectories: [] // unused
  };
  const listEncounteredPaths = (): EncounteredPaths => {
    encounteredPaths.getScriptSnapshot.sort();
    encounteredPaths.fileExists.sort();
    encounteredPaths.readFile.sort();
    return encounteredPaths;
  };

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => {
      return Object.keys(codeHolder);
    },
    getScriptVersion: (fileName) => {
      fileName = relativeNodePath(fileName);
      return (versions[fileName] ?? 1).toString();
    },
    getScriptSnapshot: (fileName) => {
      fileName = relativeNodePath(fileName);
      if (fileName in codeHolder) {
        return ts.ScriptSnapshot.fromString(codeHolder[fileName].toString());
      }

      // TODO: this should not be encountered outside of CI
      const result = ts.ScriptSnapshot.fromString(
        // NOTE: some files do not exist. A good example is "typescript/lib/es2023.ts"
        ts.sys.readFile(fileName) || '',
      );

      encounteredPaths.getScriptSnapshot.push(relativeNodePath(fileName));
      return result;
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => {
      const defaultLibFileName = ts.getDefaultLibFilePath(options);
      //console.log({ defaultLibFileName })
      //return '/lib.es2022.full.d.ts'
      return defaultLibFileName;
    },
    fileExists: (fileName) => {
      fileName = relativeNodePath(fileName);
      if (fileName in codeHolder) {
        return true;
      }

      // TODO: this should not be encountered outside of CI when tests will fail
      const result = ts.sys.fileExists(fileName);
      if (result) {
        encounteredPaths.fileExists.push(relativeNodePath(fileName));
      }
      return result;
    },
    readFile: (fileName) => {
      fileName = relativeNodePath(fileName);
      if (fileName in codeHolder) {
        return codeHolder[fileName].toString();
      }

      // TODO: this should not be encountered outside of CI when tests will fail
      const result = ts.sys.readFile(fileName);
      encounteredPaths.readFile.push(relativeNodePath(fileName));
      return result;
    },
    readDirectory: (...args) => {
      // TODO: this should not be encountered outside of CI when tests will fail
      const result = ts.sys.readDirectory(...args);
      return result;
    },
    directoryExists: (...args) => {
      // TODO: this should not be encountered outside of CI when tests will fail
      const result = ts.sys.directoryExists(...args);
      return result;
    },
    getDirectories: (...args) => {
      // TODO: this should not be encountered outside of CI when tests will fail
      const result = ts.sys.getDirectories(...args);
      return result;
    },
    log: (...args) => debugLog(args),
    trace: (...args) => debugTrace(args),
    error: (...args) => debugError(args),
  };

  return {
    languageService: ts.createLanguageService(
      servicesHost,
      ts.createDocumentRegistry(),
    ),
    updateCode,
    listFiles,
    listEncounteredPaths,
  };
}

function compileSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    '_initial_parsing.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  );
}

function getSymbolAtPosition(
  sourceFile: ts.SourceFile,
  position: number,
): string | null {
  function findNodeAtPosition(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart(sourceFile) && position <= node.getEnd()) {
      return ts.forEachChild(node, findNodeAtPosition) || node;
    }

    return undefined;
  }

  let node = findNodeAtPosition(sourceFile);

  while (node && !ts.isIdentifier(node)) {
    if (node.parent) {
      node = node.parent;
    } else {
      break;
    }
  }

  return node && ts.isIdentifier(node) ? node.getText(sourceFile) : null;
}

export type AutoCompletion = {
  result: string;
  name: string;
  kind: ts.ScriptElementKind;
};

function mapCompletions(
  filter: AutocompleteFilterFunction,
  prefix: string,
  trigger: string,
  completions: ts.CompletionInfo,
): AutoCompletion[] {
  return completions.entries
    .filter((entry) => filter({ trigger, kind: entry.kind, name: entry.name }))
    .map((entry) => {
      return {
        result: prefix + entry.name,
        name: entry.name,
        kind: entry.kind,
      };
    });
}

type AutocompleteFilterOptions = {
  trigger: string;
  kind: string;
  name: string;
};

type AutocompleteFilterFunction = (
  filterOptions: AutocompleteFilterOptions,
) => boolean;

export type AutocompleterOptions = {
  filter?: AutocompleteFilterFunction;
};

function filterDiagnostics(diagnostics: ts.Diagnostic[]): {
  fileName?: string;
  text?: string;
  messageText: string | ts.DiagnosticMessageChain;
}[] {
  return diagnostics.map((item) => {
    const result = {
      ..._.pick(item.file, 'fileName', 'text'),
      ..._.pick(item, 'messageText'),
    };

    if (result.fileName?.endsWith('shell-api.ts')) {
      delete result.text;
    }

    return result;
  });
}

export default class Autocompleter {
  private readonly filter: AutocompleteFilterFunction;
  private readonly languageService: ts.LanguageService;
  readonly updateCode: UpdateDefinitionFunction;
  readonly listFiles: () => string[];
  readonly listEncounteredPaths: () => EncounteredPaths;

  constructor({ filter }: AutocompleterOptions = {}) {
    this.filter = filter ?? (() => true);
    ({
      languageService: this.languageService,
      updateCode: this.updateCode,
      listFiles: this.listFiles,
      listEncounteredPaths: this.listEncounteredPaths,
    } = getVirtualLanguageService());
  }

  autocomplete(code: string): AutoCompletion[] {
    this.updateCode({
      '/main.ts': code,
    });

    const completions = this.languageService.getCompletionsAtPosition(
      '/main.ts',
      code.length,
      {
        allowIncompleteCompletions: true,
      },
    );

    if (debugLog.enabled) {
      for (const filename of this.listFiles()) {
        if (filename.startsWith('/')) {
          this.debugLanguageService(filename, 'getSyntacticDiagnostics');
          this.debugLanguageService(filename, 'getSemanticDiagnostics');
        }
      }
    }

    if (completions) {
      const tsAst = compileSourceFile(code);
      const symbolAtPosition = getSymbolAtPosition(tsAst, code.length) ?? '';
      const prefix = code.slice(0, code.length - symbolAtPosition.length);
      return mapCompletions(this.filter, prefix, symbolAtPosition, completions);
    }

    return [];
  }

  debugLanguageService(
    filename: string,
    method:
      | 'getSyntacticDiagnostics'
      | 'getSemanticDiagnostics'
      | 'getSuggestionDiagnostics',
  ) {
    try {
      debugLog(
        method,
        filename,
        filterDiagnostics(this.languageService[method](filename)),
      );
    } catch (err: any) {
      // These methods can throw and then it would be nice to at least know
      // why/where. One example would be when you try and alias and then import
      // a global module in the code passed to the language service.
      debugLog(method, filename, err.stack, err.ProgramFiles);
    }
  }
}
