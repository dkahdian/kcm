import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { canonicalDataset } from '../../src/lib/data/canonical.js';
import {
  applyContributionQueue,
  type ContributionQueueState,
  type ContributionQueueEntry
} from '../../src/lib/data/contribution-transforms.js';
import { generateReferenceId } from '../../src/lib/utils/reference-id.js';
import type { KCLanguage, DirectedSuccinctnessRelation, KCAdjacencyMatrix } from '../../src/lib/types.js';
import type { CustomTag } from '../../src/routes/contribute/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.join(rootDir, 'src/lib/data');
const databasePath = path.join(dataDir, 'database.json');
const contributionPath = path.join(rootDir, 'contribution.json');

type RawLanguage = Omit<KCLanguage, 'references' | 'visual'>;

interface DatabaseShape {
  languages: RawLanguage[];
  references: Array<{ id: string; bibtex: string }>;
  separatingFunctions: Array<{ shortName: string; name: string; description: string; refs: string[] }>;
  relationTypes: unknown;
  tags: unknown;
  operations: unknown;
  polytimeComplexities: unknown;
  metadata?: Record<string, unknown>;
  adjacencyMatrix: {
    languageIds: string[];
    matrix: (DirectedSuccinctnessRelation | null)[][];
  };
}

type ContributionPayload = {
  queue?: Partial<ContributionQueueState> & { entries?: ContributionQueueEntry[] };
  queueEntries?: ContributionQueueEntry[];
  entries?: ContributionQueueEntry[];
  customTags?: CustomTag[];
  modifiedRelations?: string[];
  submissionId?: string;
  supersedesSubmissionId?: string | null;
};

function assertContributionExists(payload: ContributionPayload): void {
  if (!payload) {
    throw new Error('Contribution payload is missing or unreadable.');
  }
}

function deriveRelationshipKeys(entries: ContributionQueueEntry[]): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === 'relationship') {
      keys.add(`${entry.payload.sourceId}->${entry.payload.targetId}`);
    }
  }
  return Array.from(keys);
}

function normalizeQueueState(payload: ContributionPayload): ContributionQueueState {
  const candidateEntryLists: Array<ContributionQueueEntry[] | undefined> = [
    payload.queue?.entries,
    payload.queueEntries,
    payload.entries
  ];
  let entries = candidateEntryLists.find((list): list is ContributionQueueEntry[] => Array.isArray(list));

  if (!entries || entries.length === 0) {
    throw new Error('Contribution payload must include an ordered queue.');
  }

  const modifiedRelationsCandidate = payload.queue?.modifiedRelations ?? payload.modifiedRelations;
  const modifiedRelations = Array.isArray(modifiedRelationsCandidate) && modifiedRelationsCandidate.length > 0
    ? modifiedRelationsCandidate
    : deriveRelationshipKeys(entries);

  const customTags = Array.isArray(payload.queue?.customTags)
    ? payload.queue?.customTags
    : Array.isArray(payload.customTags)
    ? payload.customTags
    : [];

  const submissionId = typeof payload.queue?.submissionId === 'string'
    ? payload.queue?.submissionId
    : typeof payload.submissionId === 'string'
    ? payload.submissionId
    : undefined;

  const supersedes = payload.queue?.supersedesSubmissionId ?? payload.supersedesSubmissionId;

  return {
    entries,
    customTags,
    modifiedRelations,
    submissionId,
    supersedesSubmissionId:
      typeof supersedes === 'string'
        ? supersedes
        : supersedes === null
        ? null
        : undefined
  };
}

function toRawLanguage(language: KCLanguage): RawLanguage {
  const { references: _references, visual: _visual, ...rest } = language;
  const properties = {
    queries: rest.properties?.queries ?? {},
    transformations: rest.properties?.transformations ?? {}
  };
  return {
    ...structuredClone({ ...rest, properties })
  };
}

function normalizeAdjacencyMatrix(matrix: KCAdjacencyMatrix) {
  const sortedIds = [...matrix.languageIds].sort((a, b) => a.localeCompare(b));
  const rebuilt = sortedIds.map((sourceId) =>
    sortedIds.map((targetId) => {
      const sourceIdx = matrix.indexByLanguage[sourceId];
      const targetIdx = matrix.indexByLanguage[targetId];
      if (sourceIdx === undefined || targetIdx === undefined) {
        return null;
      }
      const relation = matrix.matrix[sourceIdx]?.[targetIdx] ?? null;
      if (!relation) return null;
      const output: DirectedSuccinctnessRelation = {
        status: relation.status,
        refs: [...(relation.refs ?? [])]
      };
      if (relation.description) {
        output.description = relation.description;
      }
      if (relation.separatingFunctionIds?.length) {
        output.separatingFunctionIds = [...relation.separatingFunctionIds];
      }
      if (relation.separatingFunctions?.length) {
        output.separatingFunctions = relation.separatingFunctions.map((fn) => ({
          shortName: fn.shortName,
          name: fn.name,
          description: fn.description,
          refs: [...fn.refs]
        }));
      }
      return output;
    })
  );

  return { languageIds: sortedIds, matrix: rebuilt };
}

function mergeReferences(
  existing: Array<{ id: string; bibtex: string }>,
  entries: ContributionQueueEntry[]
): { references: Array<{ id: string; bibtex: string }>; created: number } {
  const updated = [...existing];
  const existingIds = new Set(updated.map((ref) => ref.id));
  const existingBibtex = new Set(updated.map((ref) => ref.bibtex.trim()));
  let created = 0;

  for (const entry of entries) {
    if (entry.kind !== 'reference') continue;
    const raw = typeof entry.payload === 'string' ? entry.payload.trim() : '';
    if (!raw) {
      console.warn('Skipping empty reference payload in queue entry', entry.id);
      continue;
    }
    if (existingBibtex.has(raw)) {
      continue;
    }
    const generatedId = generateReferenceId(raw, existingIds);
    existingIds.add(generatedId);
    existingBibtex.add(raw);
    updated.push({ id: generatedId, bibtex: raw });
    created++;
  }

  updated.sort((a, b) => a.id.localeCompare(b.id));
  return { references: updated, created };
}

try {
  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8')) as DatabaseShape;
  const contribution = JSON.parse(fs.readFileSync(contributionPath, 'utf8')) as ContributionPayload;

  assertContributionExists(contribution);

  console.log('Processing contribution via ordered queue...');

  const queueState = normalizeQueueState(contribution);
  console.log(`- Queue entries: ${queueState.entries.length}`);

  const merged = applyContributionQueue(canonicalDataset, queueState);

  const rawLanguages = merged.languages.map(toRawLanguage).sort((a, b) => a.name.localeCompare(b.name));
  database.languages = rawLanguages;

  const normalizedMatrix = normalizeAdjacencyMatrix(merged.adjacencyMatrix);
  database.adjacencyMatrix = normalizedMatrix;

  database.separatingFunctions = [...merged.separatingFunctions].sort((a, b) =>
    a.shortName.localeCompare(b.shortName)
  );

  const referenceResult = mergeReferences(database.references ?? [], queueState.entries);
  database.references = referenceResult.references;

  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
  console.log('✅ Wrote updated database.json');
  console.log(`   Languages total: ${database.languages.length}`);
  console.log(`   References added: ${referenceResult.created}`);
  console.log(`   Separating functions total: ${database.separatingFunctions.length}`);
} catch (error: any) {
  console.error('\n❌ Error generating contribution:', error?.message || error);
  process.exit(1);
}
