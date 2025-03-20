import fs from 'fs';
import path from 'path';

export function loadShellAPI(): string {
  // TODO: obviously we want the real shell-api from mongosh here
  const filename = path.join(__dirname, 'mock-shell-api.d.ts');
  return fs.readFileSync(filename, 'utf8');
}
