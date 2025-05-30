import Autocompleter from '@mongodb-js/ts-autocomplete';
import type { AutoCompletion } from '@mongodb-js/ts-autocomplete';
import autocompleteTypes from './fixtures/autocomplete-types';
import { api as ShellApiText } from '@mongosh/shell-api/api';
import { replaceImports } from './utils';

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
};

class DatabaseSchema {
  private collectionSchemas: Record<string, JSONSchema | undefined>;

  constructor() {
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
        return `  ${JSON.stringify(collectionName)}: {
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
        return `${JSON.stringify(databaseName)}: ${def}`;
      },
    );

    return `{
  ${databaseProperties.join('\n')}
}`;
  }
}

function filterStartingWith({
  kind,
  name,
  trigger,
}: {
  kind: string;
  name: string;
  trigger: string;
}): boolean {
  name = name.toLocaleLowerCase();
  trigger = trigger.toLocaleLowerCase();

  /*
  1. If the trigger was blank and the kind is not property/method filter out the
     result. This way if you autocomplete db.test.find({ you don't get all the
     global variables, just the known collection field names and mql but you can
     still autocomplete global variables and functions if you type part of the
     name.
  2. Don't filter out exact matches (where filter === name) so that we match the
     behaviour of the node completer.
  3. Make sure the name starts with the trigger, otherwise it will return every
     possible property/name that's available at that level. ie. all the "peer"
     properties of the things that match.

  TODO(MONGOSH-2207): This can be improved further if we first see if there are
  any property/method kind completions and then just use those, then if there
  aren't return all completions.
  
  The reason is that db.test.find({m makes it through this filter and then you
  get all globals starting with m anyway. But to properly solve it we need more
  context.
  
  ie. if you're after { (ie.  inside an object literal) and you're to the left
  of a : (or there isn't one) then you probably don't want globals regardless.
  If you're to the right of a : it is probably fine because you could be using a
  variable.
  */
  return (
    (trigger !== '' || kind === 'property' || kind === 'method') &&
    name.startsWith(trigger)
  );
}
export class MongoDBAutocompleter {
  private readonly context: AutocompletionContext;
  private readonly connectionSchemas: Record<string, ConnectionSchema>;
  private readonly autocompleter: Autocompleter;

  constructor({ context }: MongoDBAutocompleterOptions) {
    this.context = CachingAutocompletionContext.caching(context);
    this.autocompleter = new Autocompleter({ filter: filterStartingWith });

    this.connectionSchemas = Object.create(null);

    this.autocompleter.updateCode({
      ...autocompleteTypes,
      '/shell-api.ts': replaceImports(ShellApiText),
    });
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

type CurrentDatabaseSchema = ServerSchema[${JSON.stringify(databaseName)}];

declare global {
  const db: ShellAPI.DatabaseWithSchema<ServerSchema, CurrentDatabaseSchema>;
  const rs: ShellAPI.ReplicaSet<ServerSchema, CurrentDatabaseSchema>;
  const sh: ShellAPI.Shard<ServerSchema, CurrentDatabaseSchema>;
  const sp: ShellAPI.Streams<ServerSchema, CurrentDatabaseSchema>;
}
`;
  }

  async autocomplete(code: string): Promise<AutoCompletion[]> {
    let connectionId: string;
    let databaseName: string;

    // If there's no known connection, currentDatabaseAndConnection() will
    // error, but we won't be able to generate types for a connection, db
    // object, etc, anyway. So just return no results in that case.
    try {
      ({ connectionId, databaseName } =
        this.context.currentDatabaseAndConnection());
    } catch (err: any) {
      if (err.name === 'MongoshInvalidInputError') {
        return [];
      }
      throw err;
    }

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
