import createDebug from 'debug';
import _ from 'lodash';
import type { LanguageServiceHost } from 'typescript';
import Autocompleter from '@mongodb-js/ts-autocomplete';
import type { AutoCompletion } from '@mongodb-js/ts-autocomplete';
import autocompleteTypes from './types/autocomplete-types';
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

const debug = createDebug('mongodb-ts-autocomplete');

type MongoDBAutocompleterOptions = {
  context: AutocompletionContext;
  fallbackServiceHost?: LanguageServiceHost;
};

class DatabaseSchema {
  private collectionSchemas: Record<string, JSONSchema | undefined>;

  constructor() {
    this.collectionSchemas = Object.create(null);
  }

  setCollectionNames(collectionNames: string[]): boolean {
    let changed = false;

    // add the missing ones as undefined
    for (const collectionName of collectionNames) {
      if (!this.collectionSchemas[collectionName]) {
        this.collectionSchemas[collectionName] = undefined;
        changed = true;
      }
    }

    // remove the ones that don't exist anymore
    const knownCollectionNames = new Set(collectionNames);
    for (const key of Object.keys(this.collectionSchemas)) {
      if (!knownCollectionNames.has(key)) {
        delete this.collectionSchemas[key];
        changed = true;
      }
    }
    return changed;
  }

  setCollectionSchema(collectionName: string, schema: JSONSchema): boolean {
    const isChanged = _.isEqual(this.collectionSchemas[collectionName], schema);
    this.collectionSchemas[collectionName] = schema;
    return isChanged;
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

  addDatabase(databaseName: string): void {
    if (!this.databaseSchemas[databaseName]) {
      this.databaseSchemas[databaseName] = new DatabaseSchema();
    }
  }

  setDatabaseCollectionNames(
    databaseName: string,
    collectionNames: string[],
  ): boolean {
    this.addDatabase(databaseName);
    return this.databaseSchemas[databaseName].setCollectionNames(
      collectionNames,
    );
  }

  addCollectionSchema(
    databaseName: string,
    collectionName: string,
    collectionSchema: JSONSchema,
  ): boolean {
    this.addDatabase(databaseName);
    return this.databaseSchemas[databaseName].setCollectionSchema(
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
  private previousConnectionDB:
    | { databaseName: string; connectionId: string }
    | undefined;
  private previousCollectionName: string | undefined;

  constructor({ context, fallbackServiceHost }: MongoDBAutocompleterOptions) {
    this.context = CachingAutocompletionContext.caching(context);
    this.autocompleter = new Autocompleter({
      filter: filterStartingWith,
      fallbackServiceHost,
    });

    this.connectionSchemas = Object.create(null);

    this.autocompleter.updateCode({
      ...autocompleteTypes,
    });
  }

  addConnection(connectionId: string): ConnectionSchema {
    if (!this.connectionSchemas[connectionId]) {
      this.connectionSchemas[connectionId] = new ConnectionSchema();
    }
    return this.connectionSchemas[connectionId];
  }

  getConnectionSchemaCode(connectionId: string, schemaType: string): string {
    return `
import * as bson from '/bson.ts';
import * as mql from '/mql.ts';

export type ServerSchema = ${this.connectionSchemas[
      connectionId
    ].toTypescriptTypeDefinition()};

export type ConnectionMQLQuery = mql.Query<${schemaType}>;
export type ConnectionMQLPipeline = mql.Pipeline<${schemaType}>;
export type ConnectionMQLDocument = ${schemaType};
`;
  }

  getConnectionShellAPICode(connectionId: string): string {
    return `
/// <reference types="node" />
import {ConnectionMQLQuery, ConnectionMQLPipeline, ConnectionMQLDocument} from '/${connectionId}-schema.ts';
${adjustShellApiForConnection(ShellApiText as string)}
`;
  }

  getCurrentGlobalsCode(connectionId: string, databaseName: string): string {
    return `
import * as mql from '/mql.ts';
import {
  ServerSchema,
} from '/${connectionId}-schema.ts';
import {
  DatabaseWithSchema,
  ReplicaSet,
  Shard,
  Streams
} from '/${connectionId}-shell-api.ts';

type CurrentDatabaseSchema = ServerSchema[${JSON.stringify(databaseName)}];

declare global {
  const db: DatabaseWithSchema<ServerSchema, CurrentDatabaseSchema>;
  const rs: ReplicaSet<ServerSchema, CurrentDatabaseSchema>;
  const sh: Shard<ServerSchema, CurrentDatabaseSchema>;
  const sp: Streams<ServerSchema, CurrentDatabaseSchema>;
}
`;
  }

  async autocomplete(code: string): Promise<AutoCompletion[]> {
    // If there's no known connection we won't be able to generate types for a
    // connection, db object, etc. So just return no results in that case.
    const dbAndConnection = this.context.currentDatabaseAndConnection();
    if (!dbAndConnection) {
      this.previousConnectionDB = undefined;
      this.previousCollectionName = undefined;
      return [];
    }

    const isConnectionDBChanged = _.isEqual(
      this.previousConnectionDB,
      dbAndConnection,
    );
    this.previousConnectionDB = dbAndConnection;

    const { connectionId, databaseName } = dbAndConnection;

    const tsAst = compileSourceFile(code);
    const collectionName = inferCollectionNameFromFunctionCall(tsAst) || 'test';

    const isCollectionNameChanged =
      this.previousCollectionName !== collectionName;
    this.previousCollectionName = collectionName;

    const schema = await this.context.schemaInformationForCollection(
      connectionId,
      databaseName,
      collectionName,
    );

    const connection = this.addConnection(connectionId);
    const isSchemaChanged = connection.addCollectionSchema(
      databaseName,
      collectionName,
      schema,
    );

    const collectionNames = await this.context.collectionsForDatabase(
      connectionId,
      databaseName,
    );
    const isCollectionsChanged = connection.setDatabaseCollectionNames(
      databaseName,
      collectionNames,
    );

    if (isSchemaChanged || isCollectionsChanged) {
      // This is quit expensive because the connection code contains a modified
      // copy of the whole shell-api, so we want to only do this if the things
      // it uses actually changed.
      const schemaType = collectionNames.includes(collectionName)
        ? `ServerSchema[${JSON.stringify(databaseName)}][${JSON.stringify(collectionName)}]['schema']`
        : '{}';
      this.autocompleter.updateCode({
        [`/${connectionId}-schema.ts`]: this.getConnectionSchemaCode(
          connectionId,
          schemaType,
        ),
        [`/${connectionId}-shell-api.ts`]:
          this.getConnectionShellAPICode(connectionId),
      });
    }

    if (
      isSchemaChanged ||
      isCollectionsChanged ||
      isConnectionDBChanged ||
      isCollectionNameChanged
    ) {
      // This is moderately expensive compared to recreating the connection
      // code, but still worth doing.
      this.autocompleter.updateCode({
        '/current-globals.ts': this.getCurrentGlobalsCode(
          connectionId,
          databaseName,
        ),
      });
    }

    debug({
      connectionId,
      databaseName,
      collectionName,
      isSchemaChanged,
      isCollectionsChanged,
      isConnectionDBChanged,
      isCollectionNameChanged,
      code,
    });

    return this.autocompleter.autocomplete(code);
  }
}

function adjustShellApiForConnection(ShellApiText: string): string {
  const replacements: [RegExp, string][] = [
    // export type MQLQuery = Document; becomes declare type MQLQuery =
    // Document_2; once api-extractor does its thing.
    [/type MQLQuery = Document.*;/, 'type MQLQuery = ConnectionMQLQuery;'],
    [
      /type MQLPipeline = Document.*;/,
      'type MQLPipeline = ConnectionMQLPipeline;',
    ],
    [
      /type MQLDocument = Document.*;/,
      'type MQLDocument = ConnectionMQLDocument;',
    ],
  ];
  let result = replaceImports(ShellApiText);
  for (const [searchValue, replaceValue] of replacements) {
    if (!result.search(searchValue)) {
      throw new Error(
        `Expected shell-api to contain ${searchValue.toString()}`,
      );
    }
    result = result.replace(searchValue, replaceValue);
  }
  return result;
}
