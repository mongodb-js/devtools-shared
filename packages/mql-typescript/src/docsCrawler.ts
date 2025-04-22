import JSON5 from 'json5';
import { removeNewlines } from './utils';
import { getSimplifiedSchema } from 'mongodb-schema';
import type { SimplifiedSchema } from 'mongodb-schema';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createHash } from 'crypto';
import { BSON } from 'bson';

abstract class CustomTypeProcessor {
  public abstract process(json: string): string;

  public abstract canRevive(value: any): boolean;

  public abstract revive(value: any): any;
}

abstract class RegexCustomTypeProcessor extends CustomTypeProcessor {
  private regex: RegExp;
  private replacementPrefix: string;
  protected abstract reviveCore(value: string): any;

  protected constructor(regex: string) {
    super();
    this.regex = new RegExp(regex, 'g');
    this.replacementPrefix =
      '!rctp-' + createHash('sha256').update(regex).digest('base64');
  }

  public process(json: string): string {
    return json.replace(this.regex, `"${this.replacementPrefix}$1"`);
  }

  public canRevive(value: any): boolean {
    return (
      typeof value === 'string' && value.startsWith(this.replacementPrefix)
    );
  }

  public revive(value: string): any {
    return this.reviveCore(value.replace(this.replacementPrefix, ''));
  }
}

class IsoDateProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bISODate\\(\\s*"([^"]*)"\\s*\\)');
  }

  public reviveCore(value: string): Date | undefined {
    const isoDateRegex =
      /^(?<Y>\d{4})-?(?<M>\d{2})-?(?<D>\d{2})([T ](?<h>\d{2})(:?(?<m>\d{2})(:?((?<s>\d{2})(\.(?<ms>\d+))?))?)?(?<tz>Z|([+-])(\d{2}):?(\d{2})?)?)?$/;
    const match = isoDateRegex.exec(value);
    if (match !== null && match.groups !== undefined) {
      // Normalize the representation because ISO-8601 accepts e.g.
      // '20201002T102950Z' without : and -, but `new Date()` does not.
      const { Y, M, D, h, m, s, ms, tz } = match.groups;
      const normalized = `${Y}-${M}-${D}T${h || '00'}:${m || '00'}:${
        s || '00'
      }.${ms || '000'}${tz || 'Z'}`;
      const date = new Date(normalized);
      // Make sur we're in the range 0000-01-01T00:00:00.000Z - 9999-12-31T23:59:59.999Z
      if (
        date.getTime() >= -62167219200000 &&
        date.getTime() <= 253402300799999
      ) {
        return date;
      }
    }

    return new Date(value);
  }
}

class DateProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\b(?:new )?Date\\(\\s*"([^"]*)"\\s*\\)');
  }

  public reviveCore(value: string): Date {
    return new Date(value);
  }
}

class ObjectIdProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bObjectId\\(\\s*"([^"]*)"\\s*\\)');
  }

  public reviveCore(value: string): any {
    return new BSON.ObjectId(value);
  }
}

class NumberDecimalProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\b(?:NumberDecimal|Decimal128)\\(\\s*"([^"]*)"\\s*\\)');
  }

  public reviveCore(value: string): any {
    return new BSON.Decimal128(value);
  }
}

class UndefinedProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bundefined\\b');
  }

  public reviveCore(_: string): any {
    return undefined;
  }
}

class NullProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bnull\\b');
  }

  public reviveCore(_: string): any {
    return null;
  }
}

class BinDataProcessor extends CustomTypeProcessor {
  private regex = /\b(?:new )?BinData\(\s*(\d*), "([^")]*)"\s*\)/g;
  private replacementPrefix =
    '!bdp-' + createHash('sha256').update(this.regex.source).digest('base64');

  public process(json: string): string {
    return json.replace(this.regex, `"${this.replacementPrefix}$1-$2"`);
  }

  public canRevive(value: any): boolean {
    return (
      typeof value === 'string' && value.startsWith(this.replacementPrefix)
    );
  }

  public revive(value: string): any {
    const match = /(?<subType>\d)-(?<base64>.*)/.exec(
      value.replace(this.replacementPrefix, ''),
    );

    if (match && match.groups) {
      const { subType, base64 } = match.groups;
      return BSON.Binary.createFromBase64(base64, parseInt(subType, 10));
    }

    throw new Error(`Invalid BinData format: ${value}`);
  }
}

class NumberIntProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bNumberInt\\(\\s*(\\d*)\\s*\\)');
  }

  public reviveCore(value: string): any {
    return new BSON.Int32(value);
  }
}

export class DocsCrawler {
  constructor(private readonly url: string) {
    this.virtualConsole = new VirtualConsole();
    this.virtualConsole.on('jsdomError', () => {
      // Silence jsdom errors
    });
  }

  private virtualConsole: VirtualConsole;

  private fuzzyParse(json: string): any[] | undefined {
    try {
      return JSON5.parse(json) as any[];
    } catch {
      // Ignore parse errors
    }

    // Sometimes the snippet will end with ellipsis instead of json
    json = json.replace(/\.\.\.$/g, '');

    if (!json.startsWith('[')) {
      json = `[${json}`;
    }

    if (!json.endsWith(']')) {
      json = `${json}]`;
    }

    // Insert commas between array elements
    json = json.replace(/\}\{/g, '},{');

    const processors: CustomTypeProcessor[] = [
      new IsoDateProcessor(),
      new DateProcessor(),
      new ObjectIdProcessor(),
      new NumberDecimalProcessor(),
      new UndefinedProcessor(),
      new NullProcessor(),
      new BinDataProcessor(),
      new NumberIntProcessor(),
    ];

    for (const processor of processors) {
      json = processor.process(json);
    }

    try {
      // The docs use quoted/unquoted shell syntax inconsistently, so use JSON5 instead of regular JSON
      // to parse the documents.
      return JSON5.parse(json, (key, value) => {
        for (const processor of processors) {
          if (processor.canRevive(value)) {
            return processor.revive(value);
          }
        }

        return value;
      }) as any[];
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to parse JSON', json, message);
      return undefined;
    }
  }

  private getInsertionCode(
    element: Element | null | undefined,
  ): { collectionName: string; documents: unknown[] } | undefined {
    const codeSnippetJson = element?.querySelector('script')?.innerHTML;

    if (codeSnippetJson !== undefined) {
      let codeSnippet = removeNewlines(
        JSON.parse(codeSnippetJson).text as string,
      );
      let collectionName: string | undefined = undefined;

      const insertionCode =
        /db\.(?<collectionName>[^.]*)\.(insertMany|insertOne)\(\s*(?<documents>(?:\[|{).*(?:]|}))\s*\)/gm.exec(
          codeSnippet,
        );

      if (insertionCode && insertionCode.groups) {
        collectionName = insertionCode.groups.collectionName;
        codeSnippet = insertionCode.groups.documents;
      }

      const documents = this.fuzzyParse(codeSnippet);
      if (documents) {
        collectionName ??=
          Array.from(element?.querySelectorAll('p') || [])
            .find((p) => p.textContent?.trim().startsWith('Consider a'))
            ?.querySelector('code')?.innerHTML ?? 'TestCollection';

        return {
          collectionName,
          documents,
        };
      }
    }

    // Sometimes insertion code for the collection will be in the parent examples section. We fallback to it if we can't find it in the current section.
    while (element) {
      element = element?.parentElement?.closest('section');
      const examples = element?.querySelector("a[href='#examples']");
      if (examples) {
        return this.getInsertionCode(element);
      }
    }

    return undefined;
  }

  public async getSchema(): Promise<
    { schema: SimplifiedSchema; collectionName: string } | undefined
  > {
    const fragment = new URL(this.url).hash;
    if (!fragment) {
      return;
    }

    const dom = await JSDOM.fromURL(this.url, {
      virtualConsole: this.virtualConsole,
    });
    const exampleSection = dom.window.document
      .querySelector(`a[href='${fragment}']:not([target])`)
      ?.closest('section');

    const insertionCode = this.getInsertionCode(exampleSection);

    if (!insertionCode) {
      return;
    }

    return {
      schema: await getSimplifiedSchema(insertionCode.documents),
      collectionName: insertionCode.collectionName,
    };
  }
}
