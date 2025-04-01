import Autocompleter from '@mongodb-js/ts-autocomplete';
import type {
  AutocompleterOptions,
  AutoCompletion,
} from '@mongodb-js/ts-autocomplete';
import autocompleteTypes from './fixtures/autocomplete-types';

import type { JSONSchema } from './type-export';
import { toTypescriptTypeDefinition } from './type-export';

import {
  inferCollectionNameFromFunctionCall,
  compileSourceFile,
} from './cdt-analyser';

import { CachingAutocompletionContext } from './autocompletion-context';
import type { AutocompletionContext } from './autocompletion-context';

export { JSONSchema } from './type-export';
export { AutocompletionContext } from './autocompletion-context';

type MongoDBAutocompleterOptions = {
  context: AutocompletionContext;
  autocompleterOptions?: AutocompleterOptions;
};

class DatabaseSchema {
  private collectionNames: Set<string>;
  private collectionSchemas: Record<string, JSONSchema>;

  constructor() {
    // TODO: this is kinda the only real reason for this class: So we can keep
    // track of the known collectionNames for a database. It could be all the
    // names from a listCollections() or it could just be all the ones we've
    // auto-completed for. The schemas can come from the autocompletion context.
    // This can probably be added to the autocompletion context.
    this.collectionNames = new Set();
    this.collectionSchemas = Object.create(null);
  }

  setCollectionNames(collectionNames: string[]): void {
    this.collectionNames = new Set(collectionNames);
  }

  setCollectionSchema(collectionName: string, schema: JSONSchema): void {
    this.collectionNames.add(collectionName);
    this.collectionSchemas[collectionName] = schema;
  }

  toTypescriptTypeDefinition(): string {
    const collectionProperties = [...this.collectionNames.values()].map(
      (collectionName) => {
        const def = this.collectionSchemas[collectionName]
          ? toTypescriptTypeDefinition(this.collectionSchemas[collectionName])
          : `{}`;
        return `      '${collectionName}': ShellAPI.Collection<${def}>;`;
      }
    );

    return `{
  ${collectionProperties.join('\n')}
}`;
  }
}

class ConnectionSchema {
  private readonly databaseNames: Set<string>;
  private readonly databaseSchemas: Record<string, DatabaseSchema>;

  constructor() {
    // TODO: this is kinda the only real reason for this class: So we can keep
    // track of the known databaseNames for a connection. It could be all the
    // names from a listDatabases() or it could just be all the ones we've
    // auto-completed for. The schemas can come from the autocompletion context.
    // This can probably be added to the autocompletion context.
    this.databaseNames = new Set();
    this.databaseSchemas = Object.create(null);
  }

  addDatabase(databaseName: string) {
    this.databaseNames.add(databaseName);
    if (!this.databaseSchemas[databaseName]) {
      this.databaseSchemas[databaseName] = new DatabaseSchema();
    }
  }

  setDatabaseCollectionNames(databaseName: string, collectionNames: string[]) {
    this.addDatabase(databaseName);
    this.databaseSchemas[databaseName].setCollectionNames(collectionNames);
  }

  addCollectionSchema(
    databaseName: string,
    collectionName: string,
    collectionSchema: JSONSchema
  ) {
    this.addDatabase(databaseName);
    this.databaseSchemas[databaseName].setCollectionSchema(
      collectionName,
      collectionSchema
    );
  }

  toTypescriptTypeDefinition(): string {
    const databaseProperties = [...this.databaseNames.values()].map(
      (databaseName) => {
        const def = this.databaseSchemas[databaseName]
          ? this.databaseSchemas[databaseName].toTypescriptTypeDefinition()
          : `{}`;
        return `      '${databaseName}': ShellAPI.Database & ${def}`;
      }
    );

    return `{
  ${databaseProperties.join('\n')}
}`;
  }
}

export class MongoDBAutocompleter {
  private readonly context: AutocompletionContext;
  private connectionSchemas: Record<string, ConnectionSchema>;
  private readonly autocompleter: Autocompleter;

  constructor({ context, autocompleterOptions }: MongoDBAutocompleterOptions) {
    this.context = CachingAutocompletionContext.caching(context);
    this.autocompleter = new Autocompleter(autocompleterOptions);

    this.connectionSchemas = Object.create(null);

    this.autocompleter.updateCode(autocompleteTypes);
  }

  addConnection(connectionId: string): ConnectionSchema {
    if (!this.connectionSchemas[connectionId]) {
      this.connectionSchemas[connectionId] = new ConnectionSchema();
    }
    return this.connectionSchemas[connectionId];
  }

  getConnectionCode(connectionId: string): string {
    return `
import * as ShellAPI from '/shell-api.ts';
import * as bson from '/bson.ts';

export type ServerSchema = ${this.connectionSchemas[
      connectionId
    ].toTypescriptTypeDefinition()};
`;
  }

  getCurrentGlobalsCode(connectionId: string, databaseName: string) {
    return `
import { ServerSchema } from '/${connectionId}.ts';

type CurrentDatabaseSchema = ServerSchema['${databaseName}'];

declare global {
  var db: CurrentDatabaseSchema;
}
`;
  }

  async autocomplete(code: string): Promise<AutoCompletion[]> {
    const { connectionId, databaseName } =
      this.context.currentDatabaseAndConnection();

    // TODO: we're now compiling the source twice: autocomplete will also
    // compile if it finds completions in order to filter them. Does it matter?
    // Maybe. Not so much for a typical short shell line, probably more for a
    // large document or aggregation.
    const tsAst = compileSourceFile(code);
    const collectionName = inferCollectionNameFromFunctionCall(tsAst) || 'test';

    const schema = await this.context.schemaInformationForCollection(
      connectionId,
      databaseName,
      collectionName
    );

    const connection = this.addConnection(connectionId);
    connection.addCollectionSchema(databaseName, collectionName, schema);

    const collectionNames = await this.context.collectionsForDatabase(
      connectionId,
      databaseName
    );
    connection.setDatabaseCollectionNames(databaseName, collectionNames);

    // TODO: the problem with doing it this way is that, while the collection
    // schema might be cached, we'll be generating TypeScript for it (and every
    // other collection in the db and in fact every db in the server) every
    // time.
    this.autocompleter.updateCode({
      [`/${connectionId}.ts`]: this.getConnectionCode(connectionId),
    });
    this.autocompleter.updateCode({
      '/current-globals.ts': this.getCurrentGlobalsCode(
        connectionId,
        databaseName
      ),
    });

    return this.autocompleter.autocomplete(code);
  }
}
