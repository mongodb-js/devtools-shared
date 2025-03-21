// TODO: everything in here is just a very minimal stub until we can generate
// this file from the work in MONGOSH-2030

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
