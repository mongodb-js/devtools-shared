import * as ts from 'typescript';
import { MongoDBAutocompleter } from './index';
import type { AutocompletionContext } from './autocompletion-context';
import { analyzeDocuments } from 'mongodb-schema';
import { expect } from 'chai';
import { relativeNodePath } from '@mongodb-js/ts-autocomplete';

/*
This is intended as deliberately diabolical database and collection names to
make sure that we escape in all the right places. Does not apply for
connectionId because we're in control of connection ids and it is being used as
a file name for the language service so it needs to be somewhat reasonable
anyway.
*/
const connectionId = 'connection-1';
const databaseName = "my-'\ndatabaseName";
const collectionName = "my-'\ncollectionName";

type EncounteredPaths = {
  getScriptSnapshot: string[];
  fileExists: string[];
  readFile: string[];
};

describe('MongoDBAutocompleter', function () {
  let fallbackServiceHost: ts.LanguageServiceHost;
  let autocompleterContext: AutocompletionContext;
  let autocompleter: MongoDBAutocompleter;
  let autocompleterWithFallback: MongoDBAutocompleter;
  let encounteredPaths: EncounteredPaths;

  beforeEach(function () {
    encounteredPaths = {
      getScriptSnapshot: [],
      fileExists: [],
      readFile: [],
    };

    fallbackServiceHost = {
      // most of these are required by the type, but we won't be using them
      getDefaultLibFileName: (options) => {
        return ts.getDefaultLibFilePath(options);
      },
      getScriptFileNames: () => [],
      getScriptVersion: () => '1',
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => ({}),

      // these we'll call as fallbacks
      getScriptSnapshot: (fileName) => {
        const result = ts.ScriptSnapshot.fromString(
          // NOTE: some files do not exist. A good example is "typescript/lib/es2023.ts"
          ts.sys.readFile(fileName) || '',
        );

        encounteredPaths.getScriptSnapshot.push(relativeNodePath(fileName));
        return result;
      },
      fileExists: (fileName: string) => {
        const result = ts.sys.fileExists(fileName);
        if (result) {
          encounteredPaths.fileExists.push(relativeNodePath(fileName));
        }
        return result;
      },
      readFile: (fileName: string) => {
        const result = ts.sys.readFile(fileName);
        encounteredPaths.readFile.push(relativeNodePath(fileName));
        return result;
      },
      readDirectory: (...args) => {
        return ts.sys.readDirectory(...args);
      },
      directoryExists: (...args) => {
        return ts.sys.directoryExists(...args);
      },
      getDirectories: (...args) => {
        return ts.sys.getDirectories(...args);
      },
    };
    autocompleterContext = {
      currentDatabaseAndConnection: () => ({
        connectionId,
        databaseName,
      }),
      databasesForConnection: () =>
        Promise.resolve(['db1', 'db2', databaseName]),
      collectionsForDatabase: () =>
        Promise.resolve(['foo', 'bar', 'baz', collectionName, 'one.two']),
      schemaInformationForCollection: async (
        connectionId: string,
        databaseName: string,
        collectionName: string,
      ) => {
        let docs;
        switch (collectionName) {
          case 'foo': {
            docs = [
              {
                foo: 'foo',
                bar: 1,
                baz: {
                  a: 1,
                  b: 'b',
                },
              },
            ];
            break;
          }
          case 'bar': {
            docs = [
              {
                myField: 'myValue',
              },
            ];
            break;
          }
          default: {
            docs = [];
          }
        }

        const analyzedDocuments = await analyzeDocuments(docs);
        const schema = await analyzedDocuments.getMongoDBJsonSchema();
        return schema;
      },
    };

    autocompleter = new MongoDBAutocompleter({
      context: autocompleterContext,
    });

    autocompleterWithFallback = new MongoDBAutocompleter({
      context: autocompleterContext,
      fallbackServiceHost,
    });
  });

  /*
This test can be used to recreate the list of deps in extract-types.ts.

ie. if you comment out the deps structure so it is an empty object, run
extract-types (so it is just everything except the node types and Javascript
lib) and then run this test, then it will essentially print what that structure
needs to be.

The other tests would fail at the same time because they don't use the fallback
service host, so typescript wouldn't load all the dependencies.
  */
  it('autocompletes', async function () {
    await autocompleterWithFallback.autocomplete('db.foo.find({ fo');

    encounteredPaths.fileExists.sort();
    encounteredPaths.getScriptSnapshot.sort();
    encounteredPaths.readFile.sort();

    // this is what tells us what we're missing in extract-types.ts
    expect(encounteredPaths).to.deep.equal({
      fileExists: [],
      getScriptSnapshot: [],
      readFile: [],
    });
  });

  it('completes a bson expression', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('Ob');
      expect(completions).to.deep.equal([
        {
          kind: 'keyword',
          name: 'object',
          result: 'object',
        },
        {
          kind: 'var',
          name: 'Object',
          result: 'Object',
        },
        {
          kind: 'const',
          name: 'ObjectId',
          result: 'ObjectId',
        },
      ]);
    }
  });

  it('completes a db method', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('db.hostIn');
      expect(completions).to.deep.equal([
        {
          kind: 'method',
          name: 'hostInfo',
          result: 'db.hostInfo',
        },
      ]);
    }
  });

  it('completes a collection name', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('db.fo');
      // Note that the types are all blank objects for now because we haven't
      // sampled any of these collections' schemas yet
      expect(completions).to.deep.equal([
        {
          kind: 'property',
          name: 'foo',
          result: 'db.foo',
        },
      ]);
    }
  });

  it('completes a collection name with a dot in it', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('db.on');
      expect(completions).to.deep.equal([
        {
          kind: 'property',
          name: 'one.two',
          result: 'db.one.two',
        },
      ]);
    }
  });

  it('completes a collection method', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('db.foo.fi');
      expect(completions).to.deep.equal([
        {
          kind: 'method',
          name: 'find',
          result: 'db.foo.find',
        },
        {
          kind: 'method',
          name: 'findAndModify',
          result: 'db.foo.findAndModify',
        },
        {
          kind: 'method',
          name: 'findOne',
          result: 'db.foo.findOne',
        },
        {
          kind: 'method',
          name: 'findOneAndDelete',
          result: 'db.foo.findOneAndDelete',
        },
        {
          kind: 'method',
          name: 'findOneAndReplace',
          result: 'db.foo.findOneAndReplace',
        },
        {
          kind: 'method',
          name: 'findOneAndUpdate',
          result: 'db.foo.findOneAndUpdate',
        },
      ]);
    }
  });

  it('completes a collection field name in a query', async function () {
    // hit the same collection & schema and everythign twice
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('db.foo.find({ fo');

      expect(
        completions.filter((c) => /^(foo|bar|baz|myField)$/.test(c.name)),
      ).to.deep.equal([
        {
          kind: 'property',
          name: 'foo',
          result: 'db.foo.find({ foo',
        },
      ]);
    }

    // then hit a different collection to make sure the caching works
    const completions = await autocompleter.autocomplete('db.bar.find({ myF');

    expect(
      completions.filter((c) => /^(foo|bar|baz|myField)$/.test(c.name)),
    ).to.deep.equal([
      {
        kind: 'property',
        name: 'myField',
        result: 'db.bar.find({ myField',
      },
    ]);
  });

  it('deals with no connection', async function () {
    // The body of tests are all wrapped in loops so that we exercise the
    // caching logic in the autocompleter.
    for (let i = 0; i < 2; i++) {
      autocompleterContext.currentDatabaseAndConnection = () => {
        return undefined;
      };

      const completions = await autocompleter.autocomplete('db.');
      expect(completions).to.deep.equal([]);
    }
  });

  it('does not leak the bson package', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('bson.');
      expect(completions).to.deep.equal([]);
    }
  });

  it('does not leak the ShellAPI package', async function () {
    for (let i = 0; i < 2; i++) {
      const completions = await autocompleter.autocomplete('ShellAPI.');
      expect(completions).to.deep.equal([]);
    }
  });

  describe('getConnectionSchemaCode', function () {
    it('generates code for a connection', async function () {
      const docs = [
        {
          foo: 'foo',
          bar: 1,
          baz: {
            a: 1,
            b: 'b',
          },
        },
      ];

      const analyzedDocuments = await analyzeDocuments(docs);
      const schema = await analyzedDocuments.getMongoDBJsonSchema();

      const connection = autocompleter.addConnection(connectionId);
      connection.addCollectionSchema(databaseName, collectionName, schema);
      const code = autocompleter.getConnectionSchemaCode(
        connectionId,
        `ServerSchema[${JSON.stringify(databaseName)}][${JSON.stringify(collectionName)}]['schema']`,
      );
      expect(code).to.equal(`
import * as bson from '/bson.ts';
import * as mql from '/mql.ts';

export type ServerSchema = {
  "my-'\\ndatabaseName": {
    "my-'\\ncollectionName": {
      schema: {
        bar?: bson.Double | number;
        baz?: {
          a?: bson.Double | number;
          b?: string;
        };
        foo?: string;
      }
    };
  }
};

export type ConnectionMQLQuery = mql.Query<ServerSchema["my-'\\ndatabaseName"]["my-'\\ncollectionName"]['schema']>;
export type ConnectionMQLPipeline = mql.Pipeline<ServerSchema["my-'\\ndatabaseName"]["my-'\\ncollectionName"]['schema']>;
export type ConnectionMQLDocument = ServerSchema["my-'\\ndatabaseName"]["my-'\\ncollectionName"]['schema'];
`);
    });
  });
});
