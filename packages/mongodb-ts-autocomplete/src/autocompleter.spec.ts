import { MongoDBAutocompleter } from './index';
import type { AutocompletionContext } from './autocompletion-context';
import { analyzeDocuments } from 'mongodb-schema';
import { expect } from 'chai';

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

describe('MongoDBAutocompleter', function () {
  let autocompleterContext: AutocompletionContext;
  let autocompleter: MongoDBAutocompleter;

  before(function () {
    // make sure that we fall back to the default ts.sys file methods so that
    // encounteredPaths will be filled
    process.env.CI = 'true';
  });

  beforeEach(function () {
    autocompleterContext = {
      currentDatabaseAndConnection: () => ({
        connectionId,
        databaseName,
      }),
      databasesForConnection: () =>
        Promise.resolve(['db1', 'db2', databaseName]),
      collectionsForDatabase: () =>
        Promise.resolve(['foo', 'bar', 'baz', collectionName]),
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
  });

  afterEach(function () {
    // this is what tells us what we're missing in extract-types.ts
    const encounteredPaths = autocompleter.listEncounteredPaths();
    expect(encounteredPaths).to.deep.equal({
      fileExists: [],
      getScriptSnapshot: [],
      readFile: [],
    });
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
