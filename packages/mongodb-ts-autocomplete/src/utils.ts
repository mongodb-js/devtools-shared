export function replaceImports(code: string) {
  // mql uses these and we have to make sure the language server finds our
  // copies at runtime.

  return code
    .replace(/'bson'/g, "'/bson.ts'")
    .replace(/'mongodb'/g, "'/mongodb.ts'");
}
