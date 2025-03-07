import * as ts from 'typescript';
import createDebug from 'debug';

const debugLog = createDebug('ts-autocomplete:log');
const debugTrace = createDebug('ts-autocomplete:trace');
const debugError = createDebug('ts-autocomplete:error');

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

type AutoCompletion = {
  name: string;
  kind: ts.ScriptElementKind;
  type: string;
};

function mapCompletions(completions: ts.CompletionInfo): AutoCompletion[] {
  return completions.entries.map((entry) => {
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

export default class Autocompleter {
  private readonly languageService: ts.LanguageService;
  readonly updateCode: UpdateDefinitionFunction;

  constructor() {
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
      }
    );

    if (completions?.isMemberCompletion) {
      return mapCompletions(completions);
    } else {
      /*
      // TOOD: trying to find examples of things that are not member completions..
      if (completions) {
        console.log(completions.entries?.length, 'entries');
        if (completions.entries?.length > 100) {
          completions.entries = [];// so I can see something
        }
        console.log(completions);
        //console.log(completions?.entries.map((entry) =>  entry.name).filter((name) => name.includes('param')));
      }
        */
    }

    return [];
  }
}
