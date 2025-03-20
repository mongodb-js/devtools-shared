import MongoDBAutocompleter from './index';
import type { AutocompletionContext } from './autocompletion-context';
import { analyzeDocuments } from 'mongodb-schema';
import { expect } from 'chai';

describe('MongoDBAutocompleter', function () {
  let autocompleter: MongoDBAutocompleter;

  beforeEach(function () {
    const autocompleterContext: AutocompletionContext = {
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
      schemaInformationForAggregation: async () => {
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

  it('completes a bson expression', async function () {
    const completions = await autocompleter.autocomplete('Ob', {
      connectionId: 'myConnection',
      databaseName: 'myDatabase',
    });
    expect(completions.filter((c) => c.name === 'ObjectId')).to.deep.equal([
      {
        kind: 'function',
        name: 'ObjectId',
        type: 'ObjectId',
      },
    ]);
  });

  it('completes a collection name', async function () {
    const completions = await autocompleter.autocomplete('db.fo', {
      connectionId: 'myConnection',
      databaseName: 'myDatabase',
    });
    // Note that the types are all blank objects for now because we haven't
    // sampled any of these collections' schemas yet
    expect(completions).to.deep.equal([
      {
        kind: 'property',
        name: 'bar',
        type: 'ShellAPI.Collection<{}>',
      },
      {
        kind: 'property',
        name: 'baz',
        type: 'ShellAPI.Collection<{}>',
      },
      {
        kind: 'property',
        name: 'foo',
        type: 'ShellAPI.Collection<{}>',
      },
      {
        kind: 'method',
        name: 'runCommand',
        type: 'Document',
      },
    ]);
  });

  it('completes a collection field name', async function () {
    const completions = await autocompleter.autocomplete('db.foo.find({ fo', {
      connectionId: 'myConnection',
      databaseName: 'myDatabase',
    });

    expect(completions).to.deep.equal([
      {
        kind: 'property',
        name: 'bar',
        type: 'number',
      },
      {
        kind: 'property',
        name: 'baz',
        type: '{\n    a?: number;\n    b?: string;\n  }',
      },
      {
        kind: 'property',
        name: 'foo',
        type: 'string',
      },
    ]);
  });
});
