import NodeCache from 'node-cache';

import type { JSONSchema } from './type-export';

type CacheOptions = {
  databaseCollectionsTTL: number;
  collectionSchemaTTL: number;
  aggregationSchemaTTL: number;
};

export interface AutocompletionContext {
  collectionsForDatabase(
    connectionKey: string,
    databaseName: string
  ): Promise<string[]>;
  schemaInformationForCollection(
    connectionKey: string,
    databaseName: string,
    collectionName: string
  ): Promise<JSONSchema>;
  cacheOptions?: Partial<CacheOptions>;
}

export class CachingAutocompletionContext implements AutocompletionContext {
  readonly cacheOptions: CacheOptions;

  constructor(
    private readonly delegate: AutocompletionContext,
    private readonly cache: NodeCache
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

  async collectionsForDatabase(
    connectionKey: string,
    databaseName: string
  ): Promise<string[]> {
    const cacheKey = `collectionsForDatabase::${connectionKey}::${databaseName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as string[];
    }

    const result = await this.delegate.collectionsForDatabase(
      connectionKey,
      databaseName
    );
    this.cache.set(
      `collectionsForDatabase::${connectionKey}::${databaseName}`,
      result,
      this.cacheOptions.databaseCollectionsTTL
    );
    return result;
  }

  async schemaInformationForCollection(
    connectionKey: string,
    databaseName: string,
    collectionName: string
  ): Promise<JSONSchema> {
    const cacheKey = `schemaInformationForNamespace::${connectionKey}::${databaseName}.${collectionName}`;
    if (this.cache.has(cacheKey)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return this.cache.get(cacheKey) as JSONSchema;
    }

    const result = await this.delegate.schemaInformationForCollection(
      connectionKey,
      databaseName,
      collectionName
    );

    this.cache.set(cacheKey, result, this.cacheOptions.collectionSchemaTTL);

    return result;
  }
}
