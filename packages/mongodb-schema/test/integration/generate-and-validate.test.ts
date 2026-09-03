/* eslint-disable no-console */
/* eslint-disable mocha/max-top-level-suites */
import Ajv2020 from 'ajv/dist/2020';
import assert from 'assert';
import { Double, Int32, ObjectId, EJSON } from 'bson';
import { MongoClient, type Db } from 'mongodb';
import { MongoCluster } from '@mongodb-js/mongodb-runner';
import path from 'path';
import { tmpdir } from 'os';

import { allValidBSONTypesWithEdgeCasesDoc } from '../all-bson-types-fixture';
import { analyzeDocuments } from '../../src';

// Starts a standalone server for the enclosing suite and tears it down
// afterwards. The returned accessor is only valid inside the suite's tests.
function mochaTestServer(): () => MongoCluster {
  let cluster: MongoCluster | undefined;

  // The hooks are not top-level: they are registered when this function is
  // called from inside a suite.
  // eslint-disable-next-line mocha/no-top-level-hooks
  before(async function () {
    // Downloading the server binaries can take a long time in CI.
    this.timeout(500_000);
    cluster = await MongoCluster.start({
      topology: 'standalone',
      tmpDir: path.join(tmpdir(), 'mongodb-schema-tests'),
    });
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  after(async function () {
    await cluster?.close();
    cluster = undefined;
  });

  return () => {
    if (!cluster) throw new Error('before() hook not ran yet');
    return cluster;
  };
}

const bsonDocuments = [
  {
    _id: new ObjectId('67863e82fb817085a6b0ebad'),
    title: 'My book',
    year: new Int32(1983),
    genres: [
      'crimi',
      'comedy',
      {
        short: 'scifi',
        long: 'science fiction',
      },
    ],
    number: Double.fromString('Infinity'),
  },
  {
    _id: new ObjectId('67863eacfb817085a6b0ebae'),
    title: 'Other book',
    year: new Int32('1999'),
    author: {
      name: 'Peter Sonder',
      rating: new Double(1.3),
    },
  },
];

describe('Documents -> Generate schema -> Validate Documents against the schema', function () {
  it('Standard JSON Schema with Relaxed EJSON', async function () {
    const ajv = new Ajv2020();
    // First we get the JSON schema from BSON
    const analyzedDocuments = await analyzeDocuments(bsonDocuments);
    const schema = await analyzedDocuments.getStandardJsonSchema();
    const validate = ajv.compile(schema);
    for (const doc of bsonDocuments) {
      // Then we get EJSON
      const relaxedEJSONDoc = EJSON.serialize(doc, { relaxed: true });
      // And validate it agains the JSON Schema
      const valid = validate(relaxedEJSONDoc);
      if (validate.errors) console.error('Validation failed', validate.errors);
      assert.strictEqual(valid, true);
    }
  });
});

describe('With a MongoDB Cluster', function () {
  if (process.platform === 'win32') {
    // Shutting down mongod and removing its data files is much slower on
    // Windows CI than the default mocha timeout allows for.
    this.timeout(120_000);
  }

  let client: MongoClient;
  let db: Db;

  // We register this before mochaTestServer() so that mocha runs it first and the
  // client is closed before closing the cluster.
  after(async function () {
    await client?.close();
  });

  const cluster = mochaTestServer();

  before(async function () {
    // Connect to the mongodb instance.
    const connectionString = cluster().connectionString;
    client = new MongoClient(connectionString);
    await client.connect();
    db = client.db('test');
  });

  describe('Documents -> Generate basic schema -> Use schema in validation rule in MongoDB -> Validate documents against the schema', function () {
    before(async function () {
      // Create the schema validation rule.
      const analyzedDocuments = await analyzeDocuments(bsonDocuments);
      const schema = await analyzedDocuments.getMongoDBJsonSchema();
      const validationRule = {
        $jsonSchema: schema,
      };

      // Create a collection with the schema validation.
      await db.createCollection('books', {
        validator: validationRule,
      });
    });

    it('allows inserting valid documents', async function () {
      await db.collection('books').insertMany(bsonDocuments);
    });

    it('prevents inserting invalid documents', async function () {
      const invalidDocs = [
        {
          _id: new ObjectId('67863e82fb817085a6b0ebba'),
          title: 'Pineapple 1',
          year: new Int32(1983),
          genres: [
            'crimi',
            'comedy',
            {
              short: 'scifi',
              long: 'science fiction',
            },
          ],
          number: 'an invalid string',
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbb'),
          title: 'Pineapple 2',
          year: 'year a string',
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbc'),
          title: 123,
          year: new Int32('1999'),
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbc'),
          title: 'No year',
        },
      ];

      for (const doc of invalidDocs) {
        try {
          await db.collection('books').insertOne(doc);

          throw new Error('This should not be reached');
        } catch (e: any) {
          const expectedMessage = 'Document failed validation';
          assert.ok(
            e.message.includes(expectedMessage),
            `Expected error ${String(e.message)} message to include "${expectedMessage}", doc: ${String(doc._id)}`,
          );
        }
      }
    });
  });

  describe('[All Types] Documents -> Generate basic schema -> Use schema in validation rule in MongoDB -> Validate documents against the schema', function () {
    const allTypesCollection = 'allTypes';

    before(async function () {
      await db
        .collection(allTypesCollection)
        .insertOne(allValidBSONTypesWithEdgeCasesDoc);
      const docsFromCollection = await db
        .collection(allTypesCollection)
        .find({}, { promoteValues: false })
        .toArray();

      // Create the schema validation rule.
      const analyzedDocuments = await analyzeDocuments(docsFromCollection);
      const schema = await analyzedDocuments.getMongoDBJsonSchema();
      const validationRule = {
        $jsonSchema: schema,
      };
      // Update the collection with the schema validation.
      await db.command({
        collMod: allTypesCollection,
        validator: validationRule,
      });
    });

    it('allows inserting valid documents (does not error)', async function () {
      const docs = [
        {
          ...allValidBSONTypesWithEdgeCasesDoc,
          _id: new ObjectId(),
        },
        {
          ...allValidBSONTypesWithEdgeCasesDoc,
          _id: new ObjectId(),
        },
      ];

      try {
        await db.collection(allTypesCollection).insertMany(docs);
      } catch (err) {
        console.error(
          'Error inserting documents',
          EJSON.stringify(err, undefined, 2),
        );
        throw err;
      }
    });

    it('prevents inserting invalid documents', async function () {
      const invalidDocs = [
        {
          _id: new ObjectId('67863e82fb817085a6b0ebba'),
          title: 'Pineapple 1',
          year: new Int32(1983),
          genres: [
            'crimi',
            'comedy',
            {
              short: 'scifi',
              long: 'science fiction',
            },
          ],
          number: 'an invalid string',
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbb'),
          title: 'Pineapple 2',
          year: 'year a string',
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbc'),
          title: 123,
          year: new Int32('1999'),
        },
        {
          _id: new ObjectId('67863eacfb817085a6b0ebbc'),
          title: 'No year',
        },
      ];

      for (const doc of invalidDocs) {
        try {
          await db.collection(allTypesCollection).insertOne(doc);

          throw new Error('This should not be reached');
        } catch (e: any) {
          const expectedMessage = 'Document failed validation';
          assert.ok(
            e.message.includes(expectedMessage),
            `Expected error ${String(e.message)} message to include "${expectedMessage}", doc: ${String(doc._id)}`,
          );
        }
      }
    });
  });
});
