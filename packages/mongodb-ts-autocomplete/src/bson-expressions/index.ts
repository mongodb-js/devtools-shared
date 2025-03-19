import fs from 'fs';
import path from 'path';

export function loadBSONExpressions(): string {
  // TODO: obviously we want the real thing from mongosh here
  const filename = path.join(__dirname, 'mock-bson-expressions.d.ts');
  // TODO: this kinda raises the question: Can we get these synchronously? They
  // are currently used in the autocompleter's constructor.
  return fs.readFileSync(filename, 'utf8');
}
