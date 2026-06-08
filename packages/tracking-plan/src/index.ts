import ts from 'typescript';
import * as fs from 'fs';

export interface GenerateTrackingPlanConfig {
  /** Absolute path to the telemetry events TypeScript file */
  eventsFile: string;
  /** App name used in the markdown title. Defaults to "Tracking Plan" if omitted. */
  appName?: string;
}

interface PropertyInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface EventInfo {
  typeName: string;
  eventName: string;
  category: string;
  description: string;
  properties: PropertyInfo[];
}

interface SectionInfo {
  description: string;
  properties: PropertyInfo[];
}

// TypeScript compiler helpers
function getTelemetryEventNames(
  sourceFile: ts.SourceFile,
  unionTypeName: string,
): string[] {
  const names: string[] = [];
  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === unionTypeName &&
      ts.isUnionTypeNode(node.type)
    ) {
      for (const member of node.type.types) {
        if (
          ts.isTypeReferenceNode(member) &&
          ts.isIdentifier(member.typeName)
        ) {
          names.push(member.typeName.text);
        }
      }
    }
  });
  if (names.length === 0) {
    throw new Error(`No members found in union type '${unionTypeName}'`);
  }
  return names;
}

function buildInMemorySource(
  originalSource: ts.SourceFile,
  eventTypeNames: string[],
  identifyTraitsName: string,
  commonPropertiesName?: string,
): ts.SourceFile {
  // Appends "Resolved*" type aliases that flatten intersections and type references
  // into basic types. The TypeChecker then emits fully-expanded, readable types
  // for each event property in the tracking plan.
  const resolvedEvents = eventTypeNames
    .map(
      (name) => `
type Resolved${name} = {
  name: ${name}['name'];
  payload: ResolveType<${name} extends { payload: infer P } ? P : Record<string, never>>;
};`,
    )
    .join('\n');

  const resolvedSections = [
    `type Resolved${identifyTraitsName} = ResolveType<${identifyTraitsName}>;`,
    commonPropertiesName
      ? `type Resolved${commonPropertiesName} = ResolveType<${commonPropertiesName}>;`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const text = `
type ResolveType<T> = T extends (...args: infer A) => infer R
  ? (...args: ResolveType<A>) => ResolveType<R>
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: ResolveType<O[K]> }
    : never
  : T;

${originalSource.text}

${resolvedSections}

${resolvedEvents}
`;

  return ts.createSourceFile(
    'inMemoryFile.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
  );
}

function createChecker(sourceFile: ts.SourceFile): ts.TypeChecker {
  const options = { strictNullChecks: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (fileName: string) =>
    fileName === 'inMemoryFile.ts' ? sourceFile : undefined;
  const program = ts.createProgram(['inMemoryFile.ts'], options, host);
  return program.getTypeChecker();
}

function findDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.NamedDeclaration {
  let found: ts.NamedDeclaration | undefined;
  sourceFile.forEachChild((node: ts.Node) => {
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name.text === name
    ) {
      found = node;
    }
  });
  if (!found) throw new Error(`Declaration '${name}' not found in source`);
  return found;
}

function extractPropertiesFromType(
  type: ts.Type,
  node: ts.Node,
  checker: ts.TypeChecker,
): PropertyInfo[] {
  const props: PropertyInfo[] = [];

  for (const prop of type.getProperties()) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, node);
    const isOptionalFlag = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;
    const allowsUndefined =
      propType.isUnion() &&
      propType.types.some((t: ts.Type) => t.flags & ts.TypeFlags.Undefined);

    props.push({
      name: prop.getName(),
      type: checker.typeToString(
        propType,
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      ),
      description: ts.displayPartsToString(
        prop.getDocumentationComment(checker),
      ),
      required: !isOptionalFlag && !allowsUndefined,
    });
  }

  for (const indexInfo of checker.getIndexInfosOfType(type)) {
    props.push({
      name: `[key: ${checker.typeToString(indexInfo.keyType)}]`,
      type: checker.typeToString(
        indexInfo.type,
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      ),
      description: '',
      required: false,
    });
  }

  return props;
}

function parseTelemetryEvent(
  typeName: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): EventInfo {
  const originalNode = findDeclaration(sourceFile, typeName);
  const resolvedNode = findDeclaration(
    sourceFile,
    `Resolved${typeName}`,
  ) as ts.TypeAliasDeclaration;

  const originalSymbol = checker.getSymbolAtLocation(
    (originalNode as ts.TypeAliasDeclaration | ts.InterfaceDeclaration).name,
  );
  const description = originalSymbol
    ? ts.displayPartsToString(originalSymbol.getDocumentationComment(checker))
    : '';

  const categoryTag = ts
    .getJSDocTags(originalNode)
    .find((tag) => tag.tagName.getText() === 'category');
  const category = categoryTag?.comment?.toString() ?? 'Other';

  const resolvedType = checker.getTypeAtLocation(resolvedNode);

  const nameSymbol = resolvedType
    .getProperties()
    .find((p: ts.Symbol) => p.getName() === 'name');
  let eventName = typeName;
  if (nameSymbol) {
    const nameType = checker.getTypeOfSymbolAtLocation(
      nameSymbol,
      resolvedNode,
    );
    eventName = nameType.isStringLiteral()
      ? nameType.value
      : checker.typeToString(nameType);
  }

  const payloadSymbol = resolvedType
    .getProperties()
    .find((p: ts.Symbol) => p.getName() === 'payload');
  const properties = payloadSymbol
    ? extractPropertiesFromType(
        checker.getTypeOfSymbolAtLocation(payloadSymbol, resolvedNode),
        resolvedNode,
        checker,
      )
    : [];

  return { typeName, eventName, category, description, properties };
}

function parseSectionType(
  typeName: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): SectionInfo {
  const originalNode = findDeclaration(sourceFile, typeName);
  const resolvedNode = findDeclaration(
    sourceFile,
    `Resolved${typeName}`,
  ) as ts.TypeAliasDeclaration;

  const originalSymbol = checker.getSymbolAtLocation(
    (originalNode as ts.TypeAliasDeclaration | ts.InterfaceDeclaration).name,
  );
  const description = originalSymbol
    ? ts.displayPartsToString(originalSymbol.getDocumentationComment(checker))
    : '';

  const type = checker.getTypeAtLocation(resolvedNode);
  const properties = extractPropertiesFromType(type, resolvedNode, checker);
  return { description, properties };
}

// Markdown rendering
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function escapeTableCell(text: string): string {
  return text
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\r\n', ' ')
    .replaceAll('\n', ' ');
}

function renderPropertiesTable(
  properties: PropertyInfo[],
  lines: string[],
): void {
  if (properties.length === 0) {
    lines.push('_No additional properties._');
    return;
  }
  lines.push('| Property | Type | Required | Description |');
  lines.push('|----------|------|----------|-------------|');
  for (const prop of properties) {
    lines.push(
      `| \`${escapeTableCell(prop.name)}\` | \`${escapeTableCell(prop.type)}\` | ${prop.required ? 'Yes' : 'No'} | ${escapeTableCell(prop.description)} |`,
    );
  }
}

function renderSection(
  title: string,
  info: SectionInfo,
  lines: string[],
): void {
  lines.push(`## ${title}`);
  lines.push('');
  if (info.description) {
    lines.push(info.description);
    lines.push('');
  }
  renderPropertiesTable(info.properties, lines);
  lines.push('');
}

function generateMarkdown(
  config: GenerateTrackingPlanConfig,
  events: EventInfo[],
  identifyTraits: SectionInfo,
  commonProperties?: SectionInfo,
): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split('T')[0];

  lines.push(
    `# ${config.appName ? `${config.appName} Tracking Plan` : 'Tracking Plan'}`,
  );
  lines.push('');
  lines.push(`> Auto-generated on ${date}. Do not edit manually.`);
  lines.push(
    '> Run `npm run generate-tracking-plan` to regenerate from source.',
  );
  lines.push('');

  if (commonProperties) {
    renderSection('Common Properties', commonProperties, lines);
  }

  renderSection('Identity', identifyTraits, lines);

  const byCategory = new Map<string, EventInfo[]>();
  for (const event of events) {
    if (!byCategory.has(event.category)) byCategory.set(event.category, []);
    byCategory.get(event.category)!.push(event);
  }
  const sortedCategories = [...byCategory.keys()].sort();

  lines.push('## Table of Contents');
  lines.push('');
  for (const cat of sortedCategories) {
    lines.push(`- [${cat}](#${slugify(cat)})`);
    for (const event of byCategory.get(cat)!) {
      lines.push(`  - [${event.eventName}](#${slugify(event.eventName)})`);
    }
  }

  for (const cat of sortedCategories) {
    lines.push('');
    lines.push(`## ${cat}`);
    lines.push('');
    for (const event of byCategory.get(cat)!) {
      lines.push(`### ${event.eventName}`);
      lines.push('');
      if (event.description) {
        lines.push(event.description);
        lines.push('');
      }
      renderPropertiesTable(event.properties, lines);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function generateTrackingPlan(
  config: GenerateTrackingPlanConfig,
): string {
  const originalSource = ts.createSourceFile(
    config.eventsFile,
    fs.readFileSync(config.eventsFile, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  const unionTypeName = 'TelemetryEvent';
  const identifyTraitsName = 'IdentifyTraits';
  const commonPropertiesName = 'CommonEventProperties';
  const eventTypeNames = getTelemetryEventNames(originalSource, unionTypeName);
  const inMemorySource = buildInMemorySource(
    originalSource,
    eventTypeNames,
    identifyTraitsName,
    commonPropertiesName,
  );
  const checker = createChecker(inMemorySource);

  const identifyTraits = parseSectionType(
    identifyTraitsName,
    inMemorySource,
    checker,
  );
  const hasCommonProperties = originalSource.statements.some(
    (n) =>
      (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) &&
      n.name.text === commonPropertiesName,
  );
  const commonProperties = hasCommonProperties
    ? parseSectionType(commonPropertiesName, inMemorySource, checker)
    : undefined;

  const events = eventTypeNames.map((name) =>
    parseTelemetryEvent(name, inMemorySource, checker),
  );

  return generateMarkdown(config, events, identifyTraits, commonProperties);
}
