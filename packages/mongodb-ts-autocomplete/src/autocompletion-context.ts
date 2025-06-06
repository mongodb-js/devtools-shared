import NodeCache from 'node-cache';

import type { JSONSchema } from 'mongodb-schema';

type CacheOptions = {
  databaseCollectionsTTL: number;
  collectionSchemaTTL: number;
  aggregationSchemaTTL: number;
};

export interface AutocompletionContext {
  currentDatabaseAndConnection():
    | {
        connectionId: string;
        databaseName: string;
      }
    | undefined;
  databasesForConnection(connectionId: string): Promise<string[]>;
  collectionsForDatabase(
    connectionId: string,
    databaseName: string,
  ): Promise<string[]>;
  schemaInformationForCollection(
    connectionId: string,
    databaseName: string,
    collectionName: string,
  ): Promise<JSONSchema>;
  cacheOptions?: Partial<CacheOptions>;
}

export class CachingAutocompletionContext implements AutocompletionContext {
  readonly cacheOptions: CacheOptions;

  constructor(
    private readonly delegate: AutocompletionContext,
    private readonly cache: NodeCache,
  ) {
    this.cacheOptions = {
      databaseCollectionsTTL: 180,
      collectionSchemaTTL: 180,
      aggregationSchemaTTL: 180,
      ...delegate.cacheOptions,
    };
  }

  static caching(delegate: AutocompletionContext): AutocompletionContext {
    return new CachingAutocompletionContext(delegate, new NodeCache());
  }

  currentDatabaseAndConnection() {
    return this.delegate.currentDatabaseAndConnection();
  }

  async databasesForConnection(connectionId: string): Promise<string[]> {
    const cacheKey = `databasesForConnection::${connectionId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as string[];
    }

    const result = await this.delegate.databasesForConnection(connectionId);
    this.cache.set(cacheKey, result, this.cacheOptions.databaseCollectionsTTL);
    return result;
  }

  async collectionsForDatabase(
    connectionId: string,
    databaseName: string,
  ): Promise<string[]> {
    const cacheKey = `collectionsForDatabase::${connectionId}::${databaseName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as string[];
    }

    const result = await this.delegate.collectionsForDatabase(
      connectionId,
      databaseName,
    );
    this.cache.set(cacheKey, result, this.cacheOptions.databaseCollectionsTTL);
    return result;
  }

  async schemaInformationForCollection(
    connectionId: string,
    databaseName: string,
    collectionName: string,
  ): Promise<JSONSchema> {
    const cacheKey = `schemaInformationForNamespace::${connectionId}::${databaseName}.${collectionName}`;
    if (this.cache.has(cacheKey)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return this.cache.get(cacheKey) as JSONSchema;
    }

    const result = await this.delegate.schemaInformationForCollection(
      connectionId,
      databaseName,
      collectionName,
    );

    this.cache.set(cacheKey, result, this.cacheOptions.collectionSchemaTTL);

    return result;
  }
}
