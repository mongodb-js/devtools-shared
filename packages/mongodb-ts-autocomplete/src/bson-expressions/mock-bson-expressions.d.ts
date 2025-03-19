export {}; // turns this into an "external module"

declare global {
  namespace ShellAPI {
    export type ObjectId = {
      toString: () => string;
    };
  }

  export function ObjectId(id: string): ShellAPI.ObjectId;
}
