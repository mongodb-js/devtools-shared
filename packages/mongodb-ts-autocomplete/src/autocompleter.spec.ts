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

  beforeEach(function () {
    autocompleterContext = {
      currentDatabaseAndConnection: () => ({
        connectionId,
        databaseName,
      }),
      databasesForConnection: () => Promise.resolve(['db1', 'db2']),
      collectionsForDatabase: () => Promise.resolve(['foo', 'bar', 'baz']),
      schemaInformationForCollection: async () => {
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
        return schema;
      },
    };

    autocompleter = new MongoDBAutocompleter({
      context: autocompleterContext,
    });
  });

  it('deals with no connection', async function () {
    autocompleterContext.currentDatabaseAndConnection = () => {
      const error = new Error('No connection');
      error.name = 'MongoshInvalidInputError';
      throw error;
    };

    const completions = await autocompleter.autocomplete('db.');
    expect(completions).to.deep.equal([]);
  });

  it('does not leak the bson package', async function () {
    const completions = await autocompleter.autocomplete('bson.');
    expect(completions).to.deep.equal([]);
  });

  it('does not leak the ShellAPI package', async function () {
    const completions = await autocompleter.autocomplete('ShellAPI.');
    expect(completions).to.deep.equal([]);
  });

  it('completes a bson expression', async function () {
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
  });

  it('completes a db method', async function () {
    const completions = await autocompleter.autocomplete('db.hostIn');
    expect(completions).to.deep.equal([
      {
        kind: 'method',
        name: 'hostInfo',
        result: 'db.hostInfo',
      },
    ]);
  });

  it('completes a collection name', async function () {
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
  });

  it('completes a collection method', async function () {
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
  });

  // TODO: We need MONGOSH-2170 so that we can use the generated MQL types via
  // the Shell API to autocomplete fields in
  // ServerSchema[databaseName][collectionName].schema
  it.skip('completes a collection field name in a query', async function () {
    const completions = await autocompleter.autocomplete('db.foo.find({ fo');

    expect(
      completions.filter((c) => /^(foo|bar|baz)$/.test(c.name)),
    ).to.deep.equal([
      {
        kind: 'property',
        name: 'bar',
        result: 'db.foo.find({ bar',
      },
      {
        kind: 'property',
        name: 'baz',
        result: 'db.foo.find({ baz',
      },
      {
        kind: 'property',
        name: 'foo',
        result: 'db.foo.find({ foo',
      },
    ]);
  });

  describe('getConnectionCode', function () {
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
      const code = autocompleter.getConnectionCode(connectionId);
      expect(code).to.equal(`
import * as ShellAPI from '/shell-api.ts';
import * as bson from '/bson.ts';

export type ServerSchema = {
  ${JSON.stringify(databaseName)}: {
    ${JSON.stringify(collectionName)}: {
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
`);
    });
  });
});
