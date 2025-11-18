import { redactConnectionString as redactConnectionStringImpl } from 'mongodb-connection-string-url';

export function redactConnectionString(uri: string): string {
  return redactConnectionStringImpl(uri);
}
