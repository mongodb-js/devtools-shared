/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as schema from '../out/schema';
import type { Document } from 'bson';

type StringKey<T> = keyof T & string;
interface GenericDatabaseSchema {
  [key: string]: GenericCollectionSchema;
}

interface GenericCollectionSchema {
  schema: Document;
}

class Database<D extends GenericDatabaseSchema = GenericDatabaseSchema> {
  _collections: Record<StringKey<D>, CollectionWithSchema<D>>;

  constructor() {
    const collections: Record<string, CollectionWithSchema<D>> = Object.create(
      null,
    );
    this._collections = collections;
    const proxy = new Proxy(this, {
      get(target: any, prop: string): any {
        if (prop in target) {
          return target[prop];
        }

        if (typeof prop !== 'string' || prop.startsWith('_')) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] =
            new Collection<D>() as unknown as CollectionWithSchema<D>;
        }

        return collections[prop];
      },
    });
    return proxy;
  }
}

type DatabaseWithSchema<
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
> = Database<D> & {
  [k in StringKey<D>]: Collection<D, D[k]>;
};
class Collection<
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
  C extends GenericCollectionSchema = GenericCollectionSchema,
> {
  find(query: schema.Query<C['schema']>): Promise<schema.Query<C['schema']>> {
    return Promise.resolve(query);
  }
}
type CollectionWithSchema<
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
  C extends GenericCollectionSchema = D[keyof D],
> = Collection<D, C>;

type dbSchema = {
  myCollection: { schema: { name: string } };
};

async function run() {
  const database = new Database<dbSchema>() as DatabaseWithSchema<dbSchema>;
  const coll = database.myCollection;
  console.log(await database.myCollection.find({ name: 'foo' }));
}

run().catch(console.error);
