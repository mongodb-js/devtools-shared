export {}; // turns this into an "external module"

declare global {
  export type ObjectId = {
    toString: () => string;
  };

  export function ObjectId(id: string): ObjectId;
}
