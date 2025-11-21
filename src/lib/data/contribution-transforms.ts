import type {
  CanonicalKCData,
  KCLanguage,
  KCReference,
  DirectedSuccinctnessRelation,
  KCSeparatingFunction
} from '../types.js';
import type {
  LanguageToAdd,
  RelationshipEntry,
  SeparatingFunctionToAdd,
  CustomTag
} from '../../routes/contribute/types.js';
import { cloneDataset } from './transforms.js';
import { generateReferenceId } from '../utils/reference-id.js';

export type ContributionQueueEntry =
  | { id: string; kind: 'reference'; payload: string }
  | { id: string; kind: 'separator'; payload: SeparatingFunctionToAdd }
  | { id: string; kind: 'language:new'; payload: LanguageToAdd }
  | { id: string; kind: 'language:edit'; payload: LanguageToAdd }
  | { id: string; kind: 'relationship'; payload: RelationshipEntry };

export interface ContributionQueueState {
  entries: ContributionQueueEntry[];
  customTags: CustomTag[];
  modifiedRelations: string[];
  submissionId?: string;
  supersedesSubmissionId?: string | null;
}

function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}

function convertToKCLanguage(
  language: LanguageToAdd,
  referenceLookup: Map<string, KCReference>
): KCLanguage {
  const references: KCReference[] = [];
  for (const refId of language.descriptionRefs) {
    const ref = referenceLookup.get(refId);
    if (ref) {
      references.push(ref);
    }
  }

  return {
    name: language.name,
    fullName: language.fullName,
    description: language.description,
    descriptionRefs: [...language.descriptionRefs],
    properties: {
      queries: language.queries,
      transformations: language.transformations
    },
    tags: language.tags,
    references
  };
}

export function applyContributionQueue(
  base: CanonicalKCData,
  queue: ContributionQueueState
): CanonicalKCData {
  const merged = cloneDataset(base);

  const ensureLanguageInMatrix = (name: string) => {
    const { adjacencyMatrix } = merged;
    if (name in adjacencyMatrix.indexByLanguage) {
      return;
    }

    const newIndex = adjacencyMatrix.languageIds.length;
    adjacencyMatrix.languageIds.push(name);
    adjacencyMatrix.indexByLanguage[name] = newIndex;
    for (const row of adjacencyMatrix.matrix) {
      row.push(null);
    }
    adjacencyMatrix.matrix.push(new Array(newIndex + 1).fill(null));
  };

  const referenceLookup = new Map<string, KCReference>();
  for (const language of merged.languages) {
    if (!language.references) continue;
    for (const reference of language.references) {
      referenceLookup.set(reference.id, reference);
    }
  }
  const referenceIds = new Set(referenceLookup.keys());

  const separatingFunctionLookup = new Map<string, KCSeparatingFunction>();
  if (merged.separatingFunctions) {
    for (const fn of merged.separatingFunctions) {
      separatingFunctionLookup.set(fn.shortName, fn);
    }
  }

  const modifiedSet = new Set(queue.modifiedRelations ?? []);

  const addSeparatingFunction = (entry: SeparatingFunctionToAdd) => {
    const resolved: KCSeparatingFunction = {
      shortName: entry.shortName,
      name: entry.name,
      description: entry.description,
      refs: [...entry.refs]
    };
    separatingFunctionLookup.set(resolved.shortName, resolved);
    merged.separatingFunctions = [...(merged.separatingFunctions ?? []), resolved];
  };

  const applyRelationship = (rel: RelationshipEntry) => {
    ensureLanguageInMatrix(rel.sourceId);
    ensureLanguageInMatrix(rel.targetId);

    const sourceIdx = merged.adjacencyMatrix.indexByLanguage[rel.sourceId];
    const targetIdx = merged.adjacencyMatrix.indexByLanguage[rel.targetId];
    if (sourceIdx === undefined || targetIdx === undefined) return;

    const relationKey = `${rel.sourceId}->${rel.targetId}`;
    if (modifiedSet.size > 0 && !modifiedSet.has(relationKey)) {
      const existing = merged.adjacencyMatrix.matrix[sourceIdx]?.[targetIdx];
      if (existing) {
        return;
      }
    }

    const resolvedSeparatingFunctions: { shortName: string; name: string; description: string; refs: string[] }[] = [];
    if (rel.separatingFunctionIds && rel.separatingFunctionIds.length > 0) {
      for (const id of rel.separatingFunctionIds) {
        const fn = separatingFunctionLookup.get(id);
        if (fn) {
          resolvedSeparatingFunctions.push({
            shortName: fn.shortName,
            name: fn.name,
            description: fn.description,
            refs: [...fn.refs]
          });
        }
      }
    } else if (rel.separatingFunctions) {
      for (const fn of rel.separatingFunctions) {
        resolvedSeparatingFunctions.push({
          shortName: fn.shortName,
          name: fn.name,
          description: fn.description,
          refs: [...fn.refs]
        });
      }
    }

    const relation: DirectedSuccinctnessRelation = {
      status: rel.status,
      refs: [...rel.refs],
      separatingFunctions: resolvedSeparatingFunctions
    };
    merged.adjacencyMatrix.matrix[sourceIdx][targetIdx] = relation;
  };

  for (const entry of queue.entries) {
    switch (entry.kind) {
      case 'reference': {
        const bibtex = entry.payload;
        const generatedId = generateReferenceId(bibtex, referenceIds);
        referenceIds.add(generatedId);
        const citationKey = extractCitationKey(bibtex);
        const reference: KCReference = {
          id: generatedId,
          title: citationKey || generatedId,
          href: '',
          bibtex
        };
        referenceLookup.set(generatedId, reference);
        break;
      }
      case 'separator': {
        addSeparatingFunction(entry.payload);
        break;
      }
      case 'language:new': {
        const kcLanguage = convertToKCLanguage(entry.payload, referenceLookup);
        merged.languages.push(kcLanguage);
        ensureLanguageInMatrix(entry.payload.name);
        break;
      }
      case 'language:edit': {
        const index = merged.languages.findIndex((existing) => existing.name === entry.payload.name);
        if (index === -1) {
          // If language not present yet, treat as addition to keep queue idempotent
          const kcLanguage = convertToKCLanguage(entry.payload, referenceLookup);
          merged.languages.push(kcLanguage);
          ensureLanguageInMatrix(entry.payload.name);
        } else {
          merged.languages[index] = convertToKCLanguage(entry.payload, referenceLookup);
        }
        break;
      }
      case 'relationship': {
        applyRelationship(entry.payload);
        break;
      }
    }
  }

  return merged;
}
