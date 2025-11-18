import { redactConnectionString } from 'mongodb-connection-string-url';

export function redactUriCredentials(uri: string): string {
  return redactConnectionString(uri);
}
