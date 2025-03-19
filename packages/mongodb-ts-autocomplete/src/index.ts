import Autocompleter from '@mongodb-js/ts-autocomplete';
import type {
  AutocompleterOptions,
  AutoCompletion,
} from '@mongodb-js/ts-autocomplete';
import { loadShellAPI } from './shell-api';
import { loadBSONExpressions } from './bson-expressions';

import type { JSONSchema } from './type-export';
import { toTypescriptTypeDefinition } from './type-export';

import {
  extractPipelineUptoCaret,
  extractPipelineFromLastAggregate,
  inferCollectionNameFromFunctionCall,
  inferMongoDBCommandFromFunctionCall,
  isInAggregationPipelinePosition,
  compileSourceFile,
} from './cdt-analyser';

import type { Pipeline, AutocompletionContext } from './autocompletion-context';

type MongoDBAutocompleterOptions = {
  context: AutocompletionContext;
  autocompleterOptions?: AutocompleterOptions;
};

class DatabaseSchema {
  private collectionNames: string[];
  private collectionSchemas: Record<string, JSONSchema>;

  constructor() {
    this.collectionNames = [];
    this.collectionSchemas = Object.create(null);
  }

  setCollectionNames(collectionNames: string[]): void {
    this.collectionNames = collectionNames;
  }

  setCollectionSchema(collectionName: string, schema: JSONSchema): void {
    this.collectionSchemas[collectionName] = schema;
  }

  toTypescriptTypeDefinition(): string {
    const collectionProperties = this.collectionNames.map((collectionName) => {
      const def = this.collectionSchemas[collectionName]
        ? toTypescriptTypeDefinition(this.collectionSchemas[collectionName])
        : `{}`;
      return `      '${collectionName}': ShellAPI.Collection<${def}>;`;
    });

    return `{
  ${collectionProperties.join('\n')}
}`;
  }
}

class ConnectionSchema {
  private readonly databaseNames: string[];
  private databaseName: string;
  private readonly databaseSchemas: Record<string, DatabaseSchema>;

  constructor() {
    this.databaseNames = [];
    this.databaseName = 'test';
    this.databaseSchemas = Object.create(null);

    this.addDatabase(this.databaseName);
  }

  setDatabaseName(databaseName: string) {
    this.databaseName = databaseName;
  }

  getCurrentDatabaseName(): string {
    return this.databaseName;
  }

  addDatabase(databaseName: string) {
    this.databaseNames.push(databaseName);
    this.databaseSchemas[databaseName] = new DatabaseSchema();
  }

  setDatabaseCollectionNames(databaseName: string, collectionNames: string[]) {
    if (!this.databaseSchemas[databaseName]) {
      throw new Error(`expected ${databaseName} to be known`);
    }
    this.databaseSchemas[databaseName].setCollectionNames(collectionNames);
  }

  addCollectionSchema(
    databaseName: string,
    collectionName: string,
    collectionSchema: JSONSchema
  ) {
    if (!this.databaseSchemas[databaseName]) {
      throw new Error(`expected ${databaseName} to be known`);
    }
    this.databaseSchemas[databaseName].setCollectionSchema(
      collectionName,
      collectionSchema
    );
  }

  toTypescriptTypeDefinition(): string {
    const databaseProperties = this.databaseNames.map((databaseName) => {
      const def = this.databaseSchemas[databaseName]
        ? this.databaseSchemas[databaseName].toTypescriptTypeDefinition()
        : `{}`;
      return `      '${databaseName}': ShellAPI.Database & ${def}`;
    });

    return `{
  ${databaseProperties.join('\n')}
}`;
  }
}

export default class MongoDBAutocompleter {
  private readonly context: AutocompletionContext;
  private connectionSchemas: Record<string, ConnectionSchema>;
  private currentConnectionKey: string | undefined;
  private readonly autocompleter: Autocompleter;

  constructor({ context, autocompleterOptions }: MongoDBAutocompleterOptions) {
    this.context = context;
    this.autocompleter = new Autocompleter(autocompleterOptions);

    this.connectionSchemas = Object.create(null);
    this.connectionSchemas;

    // TODO: set the @mongodb-js/mql-typescript definitions (will this be separate or part of shell-api?)
    // these aren't globals because they are types, so probably only make sense
    // in combination with either the shell-api or something like a document or
    // aggregation editor

    this.autocompleter.updateCode({
      'bson-expressions.d.ts': loadBSONExpressions(),
    });
    this.autocompleter.updateCode({ 'shell-api.d.ts': loadShellAPI() });
  }

  setConnectionKey(connectionKey: string) {
    this.currentConnectionKey = connectionKey;
    this.connectionSchemas[this.currentConnectionKey] = new ConnectionSchema();
    this.autocompleter.updateCode({
      [`${connectionKey}.d.ts`]: this.getConnectionCode(
        this.currentConnectionKey
      ),
    });

    // do we need this? it will be rewritten before auto-completing anyway
    //this.autocompleter.updateCode({ 'current-globals.d.ts': this.getCurrentGlobalsCode() });
  }

  setDatabaseName(databaseName: string): void {
    this.getActiveConnection().setDatabaseName(databaseName);
    // do we need this? it will be rewritten before auto-completing anyway
    //this.autocompleter.updateCode({ 'current-globals.d.ts': this.getCurrentGlobalsCode() });
  }

  getActiveConnection(): ConnectionSchema {
    if (!this.currentConnectionKey) {
      throw new Error('No active connection');
    }
    return this.connectionSchemas[this.currentConnectionKey];
  }

  getConnectionCode(connectionKey: string): string {
    return `
/// <reference path="shell-api.d.ts" />

export {};

declare global {
  namespace Connection${connectionKey} {
    export type ServerSchema = ${this.connectionSchemas[
      connectionKey
    ].toTypescriptTypeDefinition()}
  }
}
`;
  }

  getCurrentGlobalsCode() {
    if (!this.currentConnectionKey) {
      throw new Error('No active connection');
    }

    const databaseName = this.getActiveConnection().getCurrentDatabaseName();
    return `
/// <reference path="shell-api.d.ts" />
/// <reference path="${this.currentConnectionKey}.d.ts" />

export {}; // turns this into an "external module"

declare global {
  type CurrentDatabaseSchema = Connection${this.currentConnectionKey}.ServerSchema['${databaseName}'];

  var db: CurrentDatabaseSchema;
  var use: (collection: string) => CurrentDatabaseSchema;
}
`;
  }

  async autocomplete(
    code: string,
    position?: number
  ): Promise<AutoCompletion[]> {
    if (!this.currentConnectionKey) {
      throw new Error('No active connection');
    }

    if (typeof position === 'undefined') {
      position = code.length;
    }

    // TODO: we're now compiling the source twice: autocomplete will also
    // compile if it finds completions in order to filter them. Does it matter?
    // Maybe. Not so much for a typical short shell line, probably more for a
    // large document or aggregation.
    const tsAst = compileSourceFile(code);
    const collectionName = inferCollectionNameFromFunctionCall(tsAst) || 'test';

    const mdbCmd = inferMongoDBCommandFromFunctionCall(tsAst);

    let schema: JSONSchema;

    if (
      isInAggregationPipelinePosition(tsAst, position) ||
      mdbCmd === 'aggregate'
    ) {
      const pipelineToDryRun =
        extractPipelineUptoCaret(tsAst, position) ||
        extractPipelineFromLastAggregate(tsAst, position) ||
        [];

      schema = await this.context.schemaInformationForAggregation(
        this.currentConnectionKey,
        this.getActiveConnection().getCurrentDatabaseName(),
        collectionName,
        pipelineToDryRun as Pipeline
      );
    } else {
      schema = await this.context.schemaInformationForCollection(
        this.currentConnectionKey,
        this.getActiveConnection().getCurrentDatabaseName(),
        collectionName
      );
    }

    const activeConnection = this.getActiveConnection();
    const databaseName = this.getActiveConnection().getCurrentDatabaseName();
    activeConnection.addCollectionSchema(databaseName, collectionName, schema);

    const collectionNames = await this.context.collectionsForDatabase(
      this.currentConnectionKey,
      databaseName
    );
    activeConnection.setDatabaseCollectionNames(databaseName, collectionNames);

    // TODO: the problem with doing it this way is that, while the collection
    // schema might be cached, we'll be generating TypeScript for it (and every
    // other collection in the db and in fact every db in the server) every
    // time.
    this.autocompleter.updateCode({
      [`${this.currentConnectionKey}.d.ts`]: this.getConnectionCode(
        this.currentConnectionKey
      ),
    });
    this.autocompleter.updateCode({
      'current-globals.d.ts': this.getCurrentGlobalsCode(),
    });

    return this.autocompleter.autocomplete(code, position);
  }
}
