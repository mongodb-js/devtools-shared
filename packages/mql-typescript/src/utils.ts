export class StringWriter {
  private buffer: string = '';

  public write(text: string) {
    this.buffer += text;
  }

  public toString() {
    return this.buffer;
  }
}

export function capitalize(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

export function removeNewlines(str: string): string {
  return str.replace(/\r?\n|\r/gm, '');
}

export function removeTrailingComments(str: string): string {
  return str.replace(/\/\/.*\r?\n/gm, '');
}
