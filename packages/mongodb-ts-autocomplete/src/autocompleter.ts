import Autocompleter from '@mongodb-js/ts-autocomplete';
import type {
  AutocompleterOptions,
  AutoCompletion,
} from '@mongodb-js/ts-autocomplete';
import autocompleteTypes from './fixtures/autocomplete-types';

import type { JSONSchema } from 'mongodb-schema';
import { toTypescriptTypeDefinition } from 'mongodb-schema';

import {
  inferCollectionNameFromFunctionCall,
  compileSourceFile,
} from './cdt-analyser';

import { CachingAutocompletionContext } from './autocompletion-context';
import type { AutocompletionContext } from './autocompletion-context';

type MongoDBAutocompleterOptions = {
  context: AutocompletionContext;
  autocompleterOptions?: AutocompleterOptions;
};

class DatabaseSchema {
  private collectionSchemas: Record<string, JSONSchema | undefined>;

  constructor() {
    // TODO: this is kinda the only real reason for this class: So we can keep
    // track of the known collectionNames for a database. It could be all the
    // names from a listCollections() or it could just be all the ones we've
    // auto-completed for. The schemas can come from the autocompletion context.
    // This can probably be added to the autocompletion context.
    this.collectionSchemas = Object.create(null);
  }

  setCollectionNames(collectionNames: string[]): void {
    // add the missing ones as undefined
    for (const collectionName of collectionNames) {
      if (!this.collectionSchemas[collectionName]) {
        this.collectionSchemas[collectionName] = undefined;
      }
    }

    // remove the ones that don't exist anymore
    const knownCollectionNames = new Set(collectionNames);
    for (const key of Object.keys(this.collectionSchemas)) {
      if (!knownCollectionNames.has(key)) {
        delete this.collectionSchemas[key];
      }
    }
  }

  setCollectionSchema(collectionName: string, schema: JSONSchema): void {
    this.collectionSchemas[collectionName] = schema;
  }

  toTypescriptTypeDefinition(): string {
    const collectionProperties = Object.entries(this.collectionSchemas).map(
      ([collectionName, schema]) => {
        const def: string = schema ? toTypescriptTypeDefinition(schema) : `{}`;
        const lines = def.split(/\n/g).map((line) => `      ${line}`);
        return `  '${collectionName}': {
      schema: ${lines.join('\n').trim()}
    };`;
      },
    );

    return `{
  ${collectionProperties.join('\n')}
  }`;
  }
}

class ConnectionSchema {
  private readonly databaseSchemas: Record<string, DatabaseSchema>;

  constructor() {
    // TODO: this is kinda the only real reason for this class: So we can keep
    // track of the known databaseNames for a connection. It could be all the
    // names from a listDatabases() or it could just be all the ones we've
    // auto-completed for. The schemas can come from the autocompletion context.
    // This can probably be added to the autocompletion context.
    this.databaseSchemas = Object.create(null);
  }

  addDatabase(databaseName: string) {
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
    collectionSchema: JSONSchema,
  ) {
    this.addDatabase(databaseName);
    this.databaseSchemas[databaseName].setCollectionSchema(
      collectionName,
      collectionSchema,
    );
  }

  toTypescriptTypeDefinition(): string {
    const databaseProperties = Object.entries(this.databaseSchemas).map(
      ([databaseName, schema]) => {
        const def = schema.toTypescriptTypeDefinition();
        return `'${databaseName}': ${def}`;
      },
    );

    return `{
  ${databaseProperties.join('\n')}
}`;
  }
}

export class MongoDBAutocompleter {
  private readonly context: AutocompletionContext;
  private readonly connectionSchemas: Record<string, ConnectionSchema>;
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
import * as ShellAPI from '/shell-api.ts';
import { ServerSchema } from '/${connectionId}.ts';

type CurrentDatabaseSchema = ServerSchema['${databaseName}'];

declare global {
  var db: ShellAPI.Database<ServerSchema, CurrentDatabaseSchema>;
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
      collectionName,
    );

    const connection = this.addConnection(connectionId);
    connection.addCollectionSchema(databaseName, collectionName, schema);

    const collectionNames = await this.context.collectionsForDatabase(
      connectionId,
      databaseName,
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
        databaseName,
      ),
    });

    return this.autocompleter.autocomplete(code);
  }
}
