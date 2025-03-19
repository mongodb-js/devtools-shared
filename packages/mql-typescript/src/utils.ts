import { unknown } from 'zod';

export class StringWriter {
  private buffer: string = '';

  public write(text: string) {
    this.buffer += text;
  }

  public toString() {
    return this.buffer;
  }
}
