import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export type PolytimeFlagCode = 'poly' | 'quasi' | 'exp' | 'not-poly-conditional' | 'unknown' | 'open';
export type TransformationStatus =
  | 'poly'
  | 'no-poly-unknown-quasi'
  | 'no-poly-quasi'
  | 'unknown-poly-quasi'
  | 'unknown-both'
  | 'no-quasi';

interface OperationSupport {
  polytime: PolytimeFlagCode;
  note?: string;
  refs: string[];
}

interface TagEntry {
  id: string;
  label: string;
  color?: string;
  description?: string;
  refs: string[];
}

interface LanguageData {
  id: string;
  name: string;
  fullName: string;
  description: string;
  descriptionRefs: string[];
  properties: {
    queries: Record<string, OperationSupport>;
    transformations: Record<string, OperationSupport>;
  };
  tags: TagEntry[];
  references: string[];
}

interface EdgeUpdate {
  edgeId: string;
  nodeA: string;
  nodeB: string;
  aToB: DirectedRelation;
  bToA: DirectedRelation;
}

interface DirectedRelation {
  status: TransformationStatus;
  description?: string;
  refs: string[];
  separatingFunctions: SeparatingFunctionData[];
}

interface SeparatingFunctionData {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
}

interface Contribution {
  languagesToAdd: Array<{
    slug: string;
    module: string;
    data: LanguageData;
  }>;
  languagesToEdit: Array<{
    slug: string;
    module: string;
    data: LanguageData;
  }>;
  newReferences: Array<{ citationKey: string; bibtex: string }>;
  edgeUpdates: EdgeUpdate[];
  contributorEmail: string;
  contributorGithub?: string;
}

const contribution: Contribution = JSON.parse(fs.readFileSync('contribution.json', 'utf8'));

function toModuleIdentifier(slug: string): string {
  return slug
    .split('-')
    .map((segment, index) => (index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join('');
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatOperationMap(map: Record<string, OperationSupport>, indent: string): string {
  const entries = Object.entries(map);
  if (entries.length === 0) {
    return '{}';
  }

  const lines = entries.map(([code, support]) => {
    const parts = [`polytime: '${escapeSingleQuotes(support.polytime)}'`];
    if (support.note) {
      parts.push(`note: '${escapeSingleQuotes(support.note)}'`);
    }
    const refs = support.refs.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ');
    parts.push(`refs: [${refs}]`);
    return `${indent}  ${code}: { ${parts.join(', ')} }`;
  });

  return `{
${lines.join(',\n')}
${indent}}`;
}

function formatTags(tags: TagEntry[]): string {
  if (tags.length === 0) {
    return '  tags: [],';
  }

  const lines = tags.map((tag) => {
    const props = [`id: '${escapeSingleQuotes(tag.id)}'`, `label: '${escapeSingleQuotes(tag.label)}'`];
    if (tag.color) {
      props.push(`color: '${escapeSingleQuotes(tag.color)}'`);
    }
    if (tag.description) {
      props.push(`description: '${escapeSingleQuotes(tag.description)}'`);
    }
    const refs = tag.refs.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ');
    props.push(`refs: [${refs}]`);
    return `    { ${props.join(', ')} }`;
  });

  return `  tags: [
${lines.join(',\n')}
  ],`;
}

function generateLanguageFile(moduleName: string, data: LanguageData): string {
  const descriptionRefs = data.descriptionRefs.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ');
  const referenceCall = data.references.length
    ? `getReferences(${data.references.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ')})`
    : '[]';

  const content = `import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const ${moduleName}: KCLanguage = {
  id: '${escapeSingleQuotes(data.id)}',
  name: '${escapeSingleQuotes(data.name)}',
  fullName: '${escapeSingleQuotes(data.fullName)}',
  description: '${escapeSingleQuotes(data.description)}',
  descriptionRefs: [${descriptionRefs}],
  properties: {
    queries: ${formatOperationMap(data.properties.queries, '    ')},
    transformations: ${formatOperationMap(data.properties.transformations, '    ')}
  },
${formatTags(data.tags)}
  references: ${referenceCall}
};
`;

  return content;
}

function updateLanguageFiles(): void {
  // Process languages to add
  for (const lang of contribution.languagesToAdd) {
    const languagePath = path.join(rootDir, 'src/lib/data/languages', `${lang.slug}.ts`);
    const content = generateLanguageFile(lang.module, lang.data);
    fs.writeFileSync(languagePath, content, 'utf8');
    console.log(`Added ${lang.slug}.ts`);
  }

  // Process languages to edit
  for (const lang of contribution.languagesToEdit) {
    const languagePath = path.join(rootDir, 'src/lib/data/languages', `${lang.slug}.ts`);
    const content = generateLanguageFile(lang.module, lang.data);
    fs.writeFileSync(languagePath, content, 'utf8');
    console.log(`Updated ${lang.slug}.ts`);
  }
}

function updateLanguagesIndex(): void {
  const indexPath = path.join(rootDir, 'src/lib/data/languages/index.ts');
  let exportMap = new Map<string, string>();

  // Read existing exports
  if (fs.existsSync(indexPath)) {
    const current = fs.readFileSync(indexPath, 'utf8');
    const exportRegex = /export \{ (\w+) \} from '.\/(.+?)\.js';/g;
    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(current)) !== null) {
      exportMap.set(match[1], match[2]);
    }
  }

  // Add new languages
  for (const lang of contribution.languagesToAdd) {
    exportMap.set(lang.module, lang.slug);
  }

  // Update edited languages (they should already be in the map, but ensure they're there)
  for (const lang of contribution.languagesToEdit) {
    exportMap.set(lang.module, lang.slug);
  }

  const sorted = Array.from(exportMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const exportLines = sorted
    .map(([module, file]) => `export { ${module} } from './${file}.js';`)
    .join('\n');
  const importLines = sorted
    .map(([module, file]) => `import { ${module} } from './${file}.js';`)
    .join('\n');
  const arrayLines = sorted.map(([module]) => `  ${module}`).join(',\n');

  const newContent = `${exportLines}

${importLines}

import type { KCLanguage } from '../../types.js';

export const allLanguages: KCLanguage[] = [
${arrayLines}
];
`;

  fs.writeFileSync(indexPath, newContent, 'utf8');
  console.log('Updated languages/index.ts');
}

function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}

function updateReferences(): void {
  if (!contribution.newReferences.length) {
    return;
  }

  const refsPath = path.join(rootDir, 'src/lib/data/references.ts');
  const content = fs.readFileSync(refsPath, 'utf8');
  const arrayMatch = content.match(/const allBibtexEntries: string\[\] = \[([\s\S]*?)\];/);

  if (!arrayMatch) {
    throw new Error('Unable to locate allBibtexEntries array in references.ts');
  }

  const existingEntries: string[] = new Function(`return [${arrayMatch[1]}];`)();
  const entryByKey = new Map<string, string>();

  for (const entry of existingEntries) {
    const key = extractCitationKey(entry);
    if (key) {
      entryByKey.set(key, entry);
    }
  }

  let added = 0;
  for (const ref of contribution.newReferences) {
    if (!entryByKey.has(ref.citationKey)) {
      entryByKey.set(ref.citationKey, ref.bibtex);
      added += 1;
    }
  }

  if (added === 0) {
    console.log('No new references to add');
    return;
  }

  const combined = Array.from(entryByKey.values());
  const formatted = combined
    .map((entry) => `  \`${entry.replace(/`/g, '\\`')}\``)
    .join(',\n');
  const updatedContent = content.replace(
    /const allBibtexEntries: string\[\] = \[[\s\S]*?\];/,
    `const allBibtexEntries: string[] = [\n${formatted}\n];`
  );

  fs.writeFileSync(refsPath, updatedContent, 'utf8');
  console.log(`Added ${added} new reference(s)`);
}

function formatSeparatingFunction(fn: SeparatingFunctionData, indent: string): string {
  const refs = fn.refs.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ');
  return `${indent}{
${indent}  shortName: '${escapeSingleQuotes(fn.shortName)}',
${indent}  name: '${escapeSingleQuotes(fn.name)}',
${indent}  description: '${escapeSingleQuotes(fn.description)}',
${indent}  refs: [${refs}]
${indent}}`;
}

function formatDirectedRelation(relation: DirectedRelation | null, indent: string): string {
  if (!relation) {
    return 'null';
  }

  const refs = relation.refs.map((ref) => `'${escapeSingleQuotes(ref)}'`).join(', ');
  const lines: string[] = [
    `{ status: '${escapeSingleQuotes(relation.status)}',`,
    `  description: '${escapeSingleQuotes(relation.description || '')}',`,
    `  refs: [${refs}],`
  ];

  if (relation.separatingFunctions.length > 0) {
    const fns = relation.separatingFunctions
      .map((fn) => formatSeparatingFunction(fn, indent + '    '))
      .join(',\n');
    lines.push(`  separatingFunctions: [\n${fns}\n${indent}  ]`);
  } else {
    lines.push(`  separatingFunctions: []`);
  }

  lines.push('}');
  return indent + lines.join(`\n${indent}`);
}

function updateEdges(): void {
  const edgesPath = path.join(rootDir, 'src/lib/data/edges.ts');
  
  if (!fs.existsSync(edgesPath)) {
    console.error('edges.ts file not found');
    return;
  }

  const content = fs.readFileSync(edgesPath, 'utf8');

  // Extract language IDs
  const langIdsMatch = content.match(/const languageIds = \[([\s\S]*?)\];/);
  if (!langIdsMatch) {
    throw new Error('Could not find languageIds in edges.ts');
  }
  const languageIds: string[] = new Function(`return [${langIdsMatch[1]}];`)();

  // Extract index mapping
  const indexMapMatch = content.match(/const indexByLanguage: Record<string, number> = \{([\s\S]*?)\};/);
  if (!indexMapMatch) {
    throw new Error('Could not find indexByLanguage in edges.ts');
  }

  // Extract matrix - more complex parsing needed
  const matrixMatch = content.match(/const matrix:.*?\[([\s\S]*?)\n\];/);
  if (!matrixMatch) {
    throw new Error('Could not find matrix in edges.ts');
  }

  // Parse existing matrix (this is complex, so we'll rebuild it)
  const matrix: (DirectedRelation | null)[][] = [];
  for (let i = 0; i < languageIds.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < languageIds.length; j++) {
      matrix[i][j] = null;
    }
  }

  // Parse existing relationships from file
  const relationRegex = /\{ status: '([^']+)', description: '([^']*)', refs: \[([^\]]*)\], separatingFunctions: (\[[^\]]*\]|[^\}]*)\}/g;
  let match;
  while ((match = relationRegex.exec(content)) !== null) {
    // This is a simplified parser - in practice, existing data should be preserved
  }

  // Apply updates from contribution
  const indexByLanguage = new Map<string, number>();
  languageIds.forEach((id, index) => {
    indexByLanguage.set(id, index);
  });

  for (const update of contribution.edgeUpdates) {
    const iA = indexByLanguage.get(update.nodeA);
    const iB = indexByLanguage.get(update.nodeB);

    if (iA === undefined || iB === undefined) {
      console.warn(`Skipping update for unknown languages: ${update.nodeA}, ${update.nodeB}`);
      continue;
    }

    // Update matrix[iA][iB] with aToB direction
    matrix[iA][iB] = update.aToB;

    // Update matrix[iB][iA] with bToA direction
    matrix[iB][iA] = update.bToA;
  }

  // Generate formatted matrix
  const matrixLines: string[] = [];
  for (let i = 0; i < languageIds.length; i++) {
    const rowLines: string[] = [];
    for (let j = 0; j < languageIds.length; j++) {
      const cell = matrix[i][j];
      if (cell === null) {
        rowLines.push('null');
      } else {
        rowLines.push(formatDirectedRelation(cell, '      '));
      }
    }
    matrixLines.push(`    [\n      ${rowLines.join(',\n      ')}\n    ]`);
  }

  const langIdsList = languageIds.map((id) => `  '${id}'`).join(',\n');
  const indexMap = languageIds.map((id, index) => `  ${id}: ${index}`).join(',\n');

  const fileContent = `import type { KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../types.js';

const languageIds = [
${langIdsList}
];

const indexByLanguage: Record<string, number> = {
${indexMap}
};

const matrix: (DirectedSuccinctnessRelation | null)[][] = [
${matrixLines.join(',\n')}
];

export function indexForLanguage(id: string): number | undefined {
  return indexByLanguage[id];
}

export function languageForIndex(index: number): string | undefined {
  return languageIds[index];
}

export const adjacencyMatrixData: KCAdjacencyMatrix = {
  languageIds,
  indexByLanguage,
  matrix
};

// Temporary export for contribution system (to be replaced)
export const edges: any[] = [];
`;

  fs.writeFileSync(edgesPath, fileContent, 'utf8');
  console.log('Updated edges.ts');
}

try {
  updateLanguageFiles();
  updateLanguagesIndex();
  updateReferences();
  updateEdges();
  console.log('Contribution processing complete.');
} catch (error) {
  console.error('Error generating contribution:', error);
  process.exit(1);
}
