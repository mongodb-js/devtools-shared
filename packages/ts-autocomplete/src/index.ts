import _ from 'lodash';
import * as ts from 'typescript';
import createDebug from 'debug';

const debugLog = createDebug('ts-autocomplete:log');
const debugTrace = createDebug('ts-autocomplete:trace');
const debugError = createDebug('ts-autocomplete:error');

type TypeFilename = string;

type UpdateDefinitionFunction = (newDef: Record<TypeFilename, string>) => void;

function getVirtualLanguageService(): [
  ts.LanguageService,
  UpdateDefinitionFunction,
  () => string[]
] {
  const codeHolder: Record<TypeFilename, string> = Object.create(null);
  const versions: Record<TypeFilename, number> = Object.create(null);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    typeRoots: [],
    allowImportingTsExtensions: true,
  };

  const updateCode = (newDef: Record<TypeFilename, string>): void => {
    for (const [key, value] of Object.entries(newDef)) {
      //console.log(key, value);
      codeHolder[key] = value;
      versions[key] = (versions[key] ?? 0) + 1;
    }
  };

  const listFiles = () => {
    return Object.keys(codeHolder);
  };

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => {
      return Object.keys(codeHolder);
    },
    getScriptVersion: (fileName) => {
      return (versions[fileName] ?? 1).toString();
    },
    getScriptSnapshot: (fileName) => {
      if (fileName in codeHolder) {
        return ts.ScriptSnapshot.fromString(codeHolder[fileName]);
      }

      return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) || '');
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) => {
      return fileName in codeHolder || ts.sys.fileExists(fileName);
    },
    readFile: (fileName) => {
      if (fileName in codeHolder) {
        return codeHolder[fileName];
      }
      return ts.sys.readFile(fileName);
    },
    readDirectory: (...args) => ts.sys.readDirectory(...args),
    directoryExists: (...args) => ts.sys.directoryExists(...args),
    getDirectories: (...args) => ts.sys.getDirectories(...args),

    log: (...args) => debugLog(args),
    trace: (...args) => debugTrace(args),
    error: (...args) => debugError(args),
  };

  return [
    ts.createLanguageService(servicesHost, ts.createDocumentRegistry()),
    updateCode,
    listFiles,
  ];
}

function compileSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    '_initial_parsing.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  );
}

function getSymbolAtPosition(
  sourceFile: ts.SourceFile,
  position: number
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
  type: string;
};

function getTypeFromDeclaration(decl: ts.Declaration): string {
  const index = decl
    .getChildren()
    .findIndex((child) => child.getFullText() === ':');
  if (index !== -1) {
    // TODO: try and trim whitespace or do something more intelligent so we
    // don't get things like "{\n    a?: any;\n    b?: string;\n  }"
    return decl
      .getChildAt(index + 1)
      ?.getFullText()
      .trim();
  }
  return 'any';
}

function mapCompletions(
  filter: AutocompleteFilterFunction,
  prefix: string,
  trigger: string,
  suffix: string,
  completions: ts.CompletionInfo
): AutoCompletion[] {
  return completions.entries
    .filter((entry) => filter({ trigger, name: entry.name }))
    .map((entry) => {
      // entry.symbol is included because we specify includeSymbol when calling
      // getCompletionsAtPosition

      const declarations = entry.symbol?.getDeclarations();
      let type = 'any';
      const decl = declarations?.[0];
      if (decl) {
        // decl's children are (usually) things like ['a', ':', 'string'] or
        // ['bb', ':', '(p1: number) => void']. So the one at position 2 (zero
        // indexed) is the type.
        // TODO: we should try and extract whatever magic vscode (via monaco) is
        // doing to get proper types out
        type = getTypeFromDeclaration(decl);
      }

      return {
        result: prefix + entry.name + suffix,
        name: entry.name,
        kind: entry.kind,
        type,
      };
    });
}

type AutocompleteFilterOptions = {
  trigger: string;
  name: string;
};

type AutocompleteFilterFunction = (
  filterOptions: AutocompleteFilterOptions
) => boolean;

export type AutocompleterOptions = {
  filter?: AutocompleteFilterFunction;
};

function filterDiagnostics(diagnostics: any[]) {
  return diagnostics.map((item) => {
    const result = {
      ..._.pick(item.file, 'fileName', 'text'),
      ..._.pick(item, 'messageText'),
    };
    return result;
  });
}

export default class Autocompleter {
  private readonly filter: AutocompleteFilterFunction;
  private readonly languageService: ts.LanguageService;
  readonly updateCode: UpdateDefinitionFunction;
  readonly listfiles: () => string[];

  constructor({ filter }: AutocompleterOptions = {}) {
    this.filter = filter ?? (() => true);
    [this.languageService, this.updateCode, this.listfiles] =
      getVirtualLanguageService();
  }

  autocomplete(code: string, position?: number): AutoCompletion[] {
    if (typeof position === 'undefined') {
      position = code.length;
    }

    this.updateCode({
      '/main.ts': code,
    });

    const completions = this.languageService.getCompletionsAtPosition(
      '/main.ts',
      position,
      {
        allowIncompleteCompletions: true,
        includeSymbol: true,
      }
    );

    if (debugLog.enabled) {
      for (const filename of this.listfiles()) {
        try {
          debugLog(
            'getSyntacticDiagnostics',
            filename,
            filterDiagnostics(
              this.languageService.getSyntacticDiagnostics(filename)
            )
          );
        } catch (err: any) {
          debugLog(
            'getSyntacticDiagnostics',
            filename,
            err.stack,
            err.ProgramFiles
          );
        }
        try {
          debugLog(
            'getSemanticDiagnostics',
            filename,
            filterDiagnostics(
              this.languageService.getSemanticDiagnostics(filename)
            )
          );
        } catch (err: any) {
          debugLog(
            'getSemanticDiagnostics',
            filename,
            err.stack,
            err.ProgramFiles
          );
        }
        //debugLog('getSuggestionDiagnostics', filename, filterDiagnostics(this.languageService.getSuggestionDiagnostics(filename));
      }
    }

    if (completions) {
      const tsAst = compileSourceFile(code);
      const symbolAtPosition = getSymbolAtPosition(tsAst, position) ?? '';
      const prefix = code.slice(0, position - symbolAtPosition.length);
      const suffix = code.slice(position);
      return mapCompletions(
        this.filter,
        prefix,
        symbolAtPosition,
        suffix,
        completions
      );
    }

    return [];
  }
}
