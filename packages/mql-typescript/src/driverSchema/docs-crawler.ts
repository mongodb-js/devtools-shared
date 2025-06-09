import { removeNewlines, removeTrailingComments } from '../utils';
import { getSimplifiedSchema } from 'mongodb-schema';
import type { SimplifiedSchema } from 'mongodb-schema';
import { JSDOM, VirtualConsole } from 'jsdom';
import parse, { ParseMode } from '@mongodb-js/shell-bson-parser';

export class DocsCrawler {
  constructor(private readonly url: string) {
    this.virtualConsole = new VirtualConsole();
    this.virtualConsole.on('jsdomError', () => {
      // Silence jsdom errors
    });
  }

  private virtualConsole: VirtualConsole;

  private fuzzyParse(json: string): unknown[] | undefined {
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

    try {
      let result = parse(json, { mode: ParseMode.Loose });

      if (!Array.isArray(result)) {
        result = [result];
      }

      if (result.length > 0) {
        const firstDoc = result[0];
        if (
          typeof firstDoc !== 'object' ||
          Object.keys(firstDoc as object).find((k) => k.startsWith('$'))
        ) {
          // If the array doesn't contain objects or the object keys start with $,
          // we're likely dealing with an aggregation pipeline rather than an insertion code.
          // return undefined and let the caller move on to the next section.
          throw new Error(
            'Result is not an array of documents or contains aggregation pipeline stages',
          );
        }

        return result;
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
