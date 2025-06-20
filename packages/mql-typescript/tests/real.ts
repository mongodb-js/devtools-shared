/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as schema from '../out/schema';
import type { Document } from 'bson';

interface GenericCollectionSchema {
  schema: Document;
}
interface GenericDatabaseSchema {
  [key: string]: GenericCollectionSchema;
}
interface GenericServerSideSchema {
  [key: string]: GenericDatabaseSchema;
}
type StringKey<T> = keyof T & string;

class Mongo<M extends GenericServerSideSchema = GenericServerSideSchema> {}

type CollectionWithSchema<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = M[keyof M],
  C extends GenericCollectionSchema = D[keyof D],
  N extends StringKey<D> = StringKey<D>,
> = Collection<M, D, C, N> & {
  [k in StringKey<D> as k extends `${N}.${infer S}` ? S : never]: Collection<
    M,
    D,
    D[k],
    k
  >;
};

class Collection<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = M[keyof M],
  C extends GenericCollectionSchema = D[keyof D],
  N extends StringKey<D> = StringKey<D>,
> {
  _mongo: Mongo<M>;
  _database: DatabaseWithSchema<M, D>;
  _name: N;
  constructor(
    mongo: Mongo<M>,
    database: DatabaseWithSchema<M, D> | Database<M, D>,
    name: N,
  ) {
    this._mongo = mongo;
    this._database = database as DatabaseWithSchema<M, D>;
    this._name = name;
  }
  getName(): N {
    return this._name;
  }
  async find(
    query?: schema.Query<Document>,
    projection?: Document,
    options: Document = {},
  ): Promise<schema.Query<Document> | undefined> {
    //): Promise<Document | undefined> {
    return Promise.resolve(query);
  }
}

type DatabaseWithSchema<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
> = Database<M, D> & {
  [k in StringKey<D>]: Collection<M, D, D[k], k>;
};

function isValidCollectionName(name: string): boolean {
  return !!name && !/[$\0]/.test(name);
}

export class Database<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
> {
  _mongo: Mongo<M>;
  _name: StringKey<M>;
  _collections: Record<StringKey<D>, CollectionWithSchema<M, D>>;

  constructor(mongo: Mongo<M>, name: StringKey<M>) {
    this._mongo = mongo;
    this._name = name;
    const collections: Record<
      string,
      CollectionWithSchema<M, D>
    > = Object.create(null);
    this._collections = collections;

    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return (target as any)[prop];
        }

        if (
          typeof prop !== 'string' ||
          prop.startsWith('_') ||
          !isValidCollectionName(prop)
        ) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] = new Collection<M, D>(
            mongo,
            proxy,
            prop,
          ) as CollectionWithSchema<M, D>;
        }

        return collections[prop];
      },
    });
    return proxy;
  }

  getCollection<K extends StringKey<D>>(
    coll: K,
  ): CollectionWithSchema<M, D, D[K], K> {
    const collection = new Collection<M, D, D['myCollection']>(
      this._mongo,
      this,
      'myCollection',
    );

    return collection as CollectionWithSchema<M, D, D[K], K>;
  }
}

async function run() {
  const serverSchema = {
    myDatabase: {
      myCollection: {
        schema: {
          _id: 'ObjectId',
          name: 'string',
          age: 'number',
        },
      },
    },
  };
  const mongo = new Mongo<typeof serverSchema>();
  const db = new Database<
    typeof serverSchema,
    (typeof serverSchema)['myDatabase']
  >(mongo, 'myDatabase') as DatabaseWithSchema<
    typeof serverSchema,
    (typeof serverSchema)['myDatabase']
  >;
  const query = await db.myCollection.find({ name: 'foo' });
  console.log(query);
}

run().catch(console.error);
