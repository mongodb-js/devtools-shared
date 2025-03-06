import * as ts from 'typescript';

type TypeFilename = string;

type UpdateDefinitionFunction = (newDef: Record<TypeFilename, string>) => void;

function getVirtualLanguageService(): [
  ts.LanguageService,
  UpdateDefinitionFunction
] {
  const codeHolder: Record<TypeFilename, string> = Object.create(null);
  const versions: Record<TypeFilename, number> = Object.create(null);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
  };

  const updateCode = (newDef: Record<TypeFilename, string>) => {
    for (const [key, value] of Object.entries(newDef)) {
      codeHolder[key] = value;
      versions[key] = (versions[key] ?? 1) + 1;
    }
  };

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(codeHolder),
    getScriptVersion: (fileName) => (versions[fileName] ?? 1).toString(),
    getScriptSnapshot: (fileName) => {
      if (fileName in codeHolder) {
        return ts.ScriptSnapshot.fromString(codeHolder[fileName]);
      }

      return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) || '');
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      fileName in codeHolder || ts.sys.fileExists(fileName),
    readFile: (fileName) => {
      if (fileName in codeHolder) {
        return codeHolder[fileName];
      }
      return ts.sys.readFile(fileName);
    },
    readDirectory: (...args) => ts.sys.readDirectory(...args),
    directoryExists: (...args) => ts.sys.directoryExists(...args),
    getDirectories: (...args) => ts.sys.getDirectories(...args),
  };

  return [
    ts.createLanguageService(servicesHost, ts.createDocumentRegistry()),
    updateCode,
  ];
}

function mapCompletions(completions: ts.CompletionInfo) {
  return completions.entries.map((entry) => {
    const declarations = entry.symbol?.getDeclarations();
    let type = 'any';
    if (declarations && declarations[0]) {
      const decl = declarations[0];
      type = decl.getChildAt(2)?.getFullText()?.trim() ?? 'any';
    }

    return {
      name: entry.name,
      kind: entry.kind,
      type,
    };
  });
}

export default class Autocompleter {
  private readonly languageService: ts.LanguageService;
  readonly updateCode: UpdateDefinitionFunction;

  constructor() {
    [this.languageService, this.updateCode] = getVirtualLanguageService();
  }

  autocomplete(code: string, position?: number) {
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
      }
    );

    if (completions?.isMemberCompletion) {
      return mapCompletions(completions);
    }

    return [];
  }
}
