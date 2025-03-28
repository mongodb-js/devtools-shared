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
] {
  const codeHolder: Record<TypeFilename, string> = Object.create(null);
  const versions: Record<TypeFilename, number> = Object.create(null);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
  };

  const updateCode = (newDef: Record<TypeFilename, string>): void => {
    for (const [key, value] of Object.entries(newDef)) {
      codeHolder[key] = value;
      versions[key] = (versions[key] ?? 0) + 1;
    }
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
  ];
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

type AutoCompletion = {
  name: string;
  kind: ts.ScriptElementKind;
  type: string;
};

function mapCompletions(
  filter: AutocompleteFilterFunction,
  trigger: string,
  completions: ts.CompletionInfo,
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
        // decl's children are things like ['a', ':', 'string'] or ['bb', ':',
        // '(p1: number) => void']. So the one at position 2 (zero indexed) is the
        // type.
        type = decl.getChildAt(2)?.getFullText()?.trim() ?? 'any';
      }

      return {
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
  filterOptions: AutocompleteFilterOptions,
) => boolean;

type AutocompleterOptions = {
  filter?: AutocompleteFilterFunction;
};

export default class Autocompleter {
  private readonly filter: AutocompleteFilterFunction;
  private readonly languageService: ts.LanguageService;
  readonly updateCode: UpdateDefinitionFunction;

  constructor({ filter }: AutocompleterOptions = {}) {
    this.filter = filter ?? (() => true);
    [this.languageService, this.updateCode] = getVirtualLanguageService();
  }

  autocomplete(code: string, position?: number): AutoCompletion[] {
    if (typeof position === 'undefined') {
      position = code.length;
    }

    this.updateCode({
      'main.ts': code,
    });

    const completions = this.languageService.getCompletionsAtPosition(
      'main.ts',
      position,
      {
        allowIncompleteCompletions: true,
        includeSymbol: true,
      },
    );

    if (completions) {
      const tsAst = compileSourceFile(code);
      const symbolAtPosition = getSymbolAtPosition(tsAst, position) ?? '';
      return mapCompletions(this.filter, symbolAtPosition, completions);
    }

    return [];
  }
}
