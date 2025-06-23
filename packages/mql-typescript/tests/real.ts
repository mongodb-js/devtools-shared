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
      get: (target, prop): any => {
        if (prop in target) {
          return (target as any)[prop];
        }

        if (typeof prop !== 'string' || prop.startsWith('_')) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] = new Collection<
            D,
            D[typeof prop]
          >() as CollectionWithSchema<D, D[typeof prop]>;
        }

        return collections[prop];
      },
    });
    return proxy;
  }
}

type DatabaseWithSchema<
  D extends GenericDatabaseSchema = GenericDatabaseSchema,
> = Database<D>;
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

async function run() {
  const database = new Database<{
    myCollection: { schema: { name: string } };
  }>();
  console.log(await database.myCollection.find({ name: 'foo' }));
}

run().catch(console.error);
