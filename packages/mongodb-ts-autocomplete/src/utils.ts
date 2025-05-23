export function replaceImports(code: string) {
  // This just makes it possible to work on mql.ts because then the
  // IDE finds the import.
  return code.replace(/'bson'/g, "'/bson.ts'");
}
