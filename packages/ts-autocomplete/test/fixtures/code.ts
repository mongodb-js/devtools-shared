/* eslint-disable @typescript-eslint/no-empty-function */
export type MyObject = {
  stringProp: string;
  functionProp: (p1: number) => void;
  'foo.bar': string;
};

export type MyFunctionParams = { param1: string; param2: string };

declare global {
  export const myGlobalObject: MyObject;
  export function myGlobalFunction(params: MyFunctionParams): void;
}
