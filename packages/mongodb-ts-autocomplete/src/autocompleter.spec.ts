import { MongoDBAutocompleter } from './index';
import type { AutocompletionContext } from './autocompletion-context';
import { analyzeDocuments } from 'mongodb-schema';
import { expect } from 'chai';

describe.only('MongoDBAutocompleter', function () {
  let autocompleterContext: AutocompletionContext;
  let autocompleter: MongoDBAutocompleter;

  beforeEach(function () {
    autocompleterContext = {
      currentDatabaseAndConnection: () => ({
        connectionId: 'my-connectionId',
        databaseName: 'my-databaseName',
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

  it('does not leak the bson package', async function () {
    const completions = await autocompleter.autocomplete('bson.');
    expect(completions).to.deep.equal([]);
  });

  it('completes a bson expression', async function () {
    const completions = await autocompleter.autocomplete('Ob');
    expect(completions.filter((c) => c.name === 'ObjectId')).to.deep.equal([
      {
        kind: 'function',
        name: 'ObjectId',
        result: 'ObjectId',
      },
    ]);
  });

  it('completes a collection name', async function () {
    const completions = await autocompleter.autocomplete('db.fo');
    // Note that the types are all blank objects for now because we haven't
    // sampled any of these collections' schemas yet
    expect(
      completions
        .filter((c) => /property|method/.test(c.kind))
        .filter((c) => c.name === 'foo'),
    ).to.deep.equal([
      {
        kind: 'property',
        name: 'foo',
        result: 'db.foo',
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

      const connection = autocompleter.addConnection('my-connectionId');
      connection.addCollectionSchema(
        'my-databaseName',
        'my-collectionName',
        schema,
      );
      const code = autocompleter.getConnectionCode('my-connectionId');
      expect(code).to.equal(`
import * as ShellAPI from '/shell-api.ts';
import * as bson from '/bson.ts';

export type ServerSchema = {
  'my-databaseName': {
    'my-collectionName': {
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
