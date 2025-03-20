export {}; // turns this into an "external module"

declare global {
  namespace ShellAPI {
    // TODO: most of these are actually MQL
    export interface Document {
      [key: string]: any;
    }

    export interface Array<T> {
      [n: number]: T;
    }

    export interface Cursor<T> {
      toArray(): Array<T>;
      first: T;
    }

    export type Filter<T> = T;
    export type Project<T> = {
      $project: {
        [t in keyof T]: 1 | 0;
      };
    };

    export type Lookup<T, R> = {
      $lookup: {
        from: string;
        localField: keyof T;
        foreignField: keyof R;
        as: string;
      };
    };

    export type Match<T> = {
      $match: Filter<T>;
    };

    export type Pipeline<T> = Array<Match<T> | Project<T> | Lookup<T, any>>;

    export interface Collection<T> {
      find(query: Filter<T>): Cursor<T>;
      findOne(query: Filter<T>): T;
      aggregate(pipeline: Pipeline<T>): Cursor<T>;
      insertOne(value: T): void;
      insertMany(value: Array<T>): void;
      updateOne(query: Filter<T>, modifier: Partial<T> | Pipeline<T>): void;
      updateMany(query: Filter<T>, modifier: Partial<T> | Pipeline<T>): void;
    }

    export interface Database {
      runCommand(cmd: string | Document, options: Document): Document;
    }
  }
}

// NOTE: there are no globals declared yet. db and others will be generated
// separately based on the the current database/collection/aggregation/whatever
// that's being accessed. Those just use these types.
