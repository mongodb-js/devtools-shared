// TODO: everything in here is just a very minimal stub until we can generate
// this file from the real bson types

export {}; // turns this into an "external module"

// this has to be global otherwise the other files won't be able to use the
// namespace
declare global {
  export namespace BSON {
    export type ObjectId = {
      toString: () => string;
    };
  }
}
