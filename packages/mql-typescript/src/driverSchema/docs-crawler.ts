import JSON5 from 'json5';
import { removeNewlines, removeTrailingComments } from '../utils';
import { getSimplifiedSchema } from 'mongodb-schema';
import type { SimplifiedSchema } from 'mongodb-schema';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createHash } from 'crypto';
import { BSON } from 'bson';

abstract class CustomTypeProcessor {
  public abstract process(json: string): string;

  public abstract canRevive(value: unknown): boolean;

  public abstract revive(value: unknown): unknown;
}

abstract class RegexCustomTypeProcessor extends CustomTypeProcessor {
  private regex: RegExp;
  private replacementPrefix: string;
  protected abstract reviveCore(value: string): unknown;

  protected constructor(regex: string) {
    super();
    this.regex = new RegExp(regex, 'g');
    this.replacementPrefix =
      '!rctp-' + createHash('sha256').update(regex).digest('base64');
  }

  public process(json: string): string {
    return json.replace(this.regex, `"${this.replacementPrefix}$1"`);
  }

  public canRevive(value: unknown): boolean {
    return (
      typeof value === 'string' && value.startsWith(this.replacementPrefix)
    );
  }

  public revive(value: string): unknown {
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
      // Make sure we're in the range 0000-01-01T00:00:00.000Z - 9999-12-31T23:59:59.999Z
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

  public reviveCore(value: string): unknown {
    return new BSON.ObjectId(value);
  }
}

class UUIDProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bUUID\\(\\s*"([^"]*)"\\s*\\)');
  }

  public reviveCore(value: string): unknown {
    return new BSON.UUID(value);
  }
}

class NumberDecimalProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\b(?:NumberDecimal|Decimal128)\\(\\s*"?([^"]*)"?\\s*\\)');
  }

  public reviveCore(value: string): unknown {
    return new BSON.Decimal128(value);
  }
}

class UndefinedProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bundefined\\b');
  }

  public reviveCore(): unknown {
    return undefined;
  }
}

class NullProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bnull\\b');
  }

  public reviveCore(): unknown {
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

  public canRevive(value: unknown): boolean {
    return (
      typeof value === 'string' && value.startsWith(this.replacementPrefix)
    );
  }

  public revive(value: string): unknown {
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
    super('\\b(?:NumberInt|Int32)\\(\\s*"?(\\d*)\\"?\\s*\\)');
  }

  public reviveCore(value: string): unknown {
    return new BSON.Int32(value);
  }
}

class NumberLongProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bNumberLong\\(\\s*"?([\\d.]*)"?\\s*\\)');
  }

  public reviveCore(value: string): unknown {
    return new BSON.Long(value);
  }
}

class TimestampProcessor extends RegexCustomTypeProcessor {
  constructor() {
    super('\\bTimestamp\\(\\s*(\\d*,\\s*\\d*)\\s*\\)');
  }

  public reviveCore(value: string): unknown {
    const match = /(?<t>\d*),\s(?<i>\d*)/.exec(value);

    if (match && match.groups) {
      const { t, i } = match.groups;
      return new BSON.Timestamp({ t: parseInt(t, 10), i: parseInt(i, 10) });
    }

    throw new Error(`Invalid Timestamp format: ${value}`);
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

  private fuzzyParse(json: string): unknown[] | undefined {
    try {
      const result = JSON5.parse(json);
      if (Array.isArray(result)) {
        return result;
      }

      if (typeof result === 'object') {
        return [result];
      }
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
    json = json.replace(/\}\s*\{/g, '},{');

    const processors: CustomTypeProcessor[] = [
      new IsoDateProcessor(),
      new DateProcessor(),
      new ObjectIdProcessor(),
      new UUIDProcessor(),
      new NumberDecimalProcessor(),
      new UndefinedProcessor(),
      new NullProcessor(),
      new BinDataProcessor(),
      new NumberIntProcessor(),
      new NumberLongProcessor(),
      new TimestampProcessor(),
    ];

    for (const processor of processors) {
      json = processor.process(json);
    }

    try {
      // The docs use quoted/unquoted shell syntax inconsistently, so use JSON5 instead of regular JSON
      // to parse the documents.
      const result = JSON5.parse(json, (key, value) => {
        for (const processor of processors) {
          if (processor.canRevive(value)) {
            return processor.revive(value);
          }
        }

        return value;
      });

      if (Array.isArray(result)) {
        return result;
      }

      if (typeof result === 'object') {
        return [result];
      }

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unexpected json output: ${result}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to parse JSON', json, message);
      return undefined;
    }
  }

  private getInsertionCode(
    element: Element | null | undefined,
    extendedSearch = false,
  ): { collectionName: string; documents: unknown[] } | undefined {
    if (!element) {
      return undefined;
    }

    // For concrete examples we only want the first code snippet as the second
    // typically shows the output. Conversely, for the "Examples" section, we want
    // all code snippets as it's possible that the first one is not the insertion code.
    // E.g. https://www.mongodb.com/docs/manual/reference/operator/query/text/#examples
    const snippets = [...element.querySelectorAll('script')].slice(
      0,
      extendedSearch ? 2 : 1,
    );

    for (const snippet of snippets) {
      let codeSnippet = JSON.parse(snippet.innerHTML).text as string;

      codeSnippet = removeTrailingComments(codeSnippet);
      codeSnippet = removeNewlines(codeSnippet);
      let collectionName: string | undefined = undefined;

      const insertionCode =
        /db(?:\..*)?\.(?<collectionName>[^.]*)\.(insertMany|insertOne)\s*\(\s*(?<documents>(?:\[|{).*(?:]|}))\s*\)/gm.exec(
          codeSnippet,
        );

      if (insertionCode && insertionCode.groups) {
        collectionName = insertionCode.groups.collectionName;
        codeSnippet = insertionCode.groups.documents;
      } else {
        const aggregationDocs =
          /db\.aggregate\(\s*\[\s*{\s*\$documents:\s*(?<documents>\[.*])\s*},\s*{\s*\$/gm.exec(
            codeSnippet,
          );
        if (aggregationDocs && aggregationDocs.groups) {
          codeSnippet = aggregationDocs.groups.documents;
        }
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
      const examples =
        element?.querySelector("a[href='#examples']") ??
        element?.querySelector("a[href='#example']");
      if (examples) {
        return this.getInsertionCode(element, true);
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

    try {
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to parse schema', this.url, message);
      return;
    }
  }
}
