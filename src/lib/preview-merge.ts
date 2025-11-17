/**
 * Preview Merge Utilities
 * 
 * Merges baseline graph data with queued contribution changes for preview
 */

import type { GraphData, KCLanguage, KCReference, KCAdjacencyMatrix, DirectedSuccinctnessRelation } from './types.js';
import type { LanguageToAdd, RelationshipEntry, SeparatingFunctionEntry } from '../routes/contribute/types.js';
import { generateReferenceId } from './utils/reference-id.js';

export interface QueuedChanges {
  languagesToAdd: LanguageToAdd[];
  languagesToEdit: LanguageToAdd[];
  relationships: RelationshipEntry[];
  newReferences: string[];
  customTags: Array<{ label: string; color: string; description?: string; refs: string[] }>;
  modifiedRelations: string[];
  submissionId?: string;
  supersedesSubmissionId?: string | null;
}

/**
 * Parse BibTeX to extract citation key (used as reference ID)
 */
function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}

/**
 * Convert LanguageToAdd to KCLanguage format
 */
function convertToKCLanguage(lang: LanguageToAdd, existingReferences: KCReference[]): KCLanguage {
  // Map reference IDs (including new-X placeholders) to actual references
  const langRefs: KCReference[] = [];
  
  for (const refId of lang.descriptionRefs) {
    const existing = existingReferences.find(r => r.id === refId);
    if (existing) {
      langRefs.push(existing);
    }
  }

  return {
    name: lang.name,
    fullName: lang.fullName,
    description: lang.description,
    descriptionRefs: lang.descriptionRefs,
    properties: {
      queries: lang.queries,
      transformations: lang.transformations
    },
    tags: lang.tags,
    references: langRefs
  };
}

/**
 * Merge queued changes into baseline graph data
 */
export function mergeQueueIntoBaseline(baseline: GraphData, queue: QueuedChanges): GraphData {
  // Clone baseline to avoid mutations
  const merged: GraphData = {
    languages: [...baseline.languages],
    adjacencyMatrix: {
      languageIds: [...baseline.adjacencyMatrix.languageIds],
      indexByLanguage: { ...baseline.adjacencyMatrix.indexByLanguage },
      matrix: baseline.adjacencyMatrix.matrix.map(row => [...row])
    },
    relationTypes: baseline.relationTypes
  };

  const ensureLanguageInMatrix = (name: string) => {
    if (name in merged.adjacencyMatrix.indexByLanguage) {
      return;
    }

    const newIndex = merged.adjacencyMatrix.languageIds.length;
    merged.adjacencyMatrix.languageIds.push(name);
    merged.adjacencyMatrix.indexByLanguage[name] = newIndex;

    for (const row of merged.adjacencyMatrix.matrix) {
      row.push(null);
    }

    const newRow = new Array(merged.adjacencyMatrix.languageIds.length).fill(null);
    merged.adjacencyMatrix.matrix.push(newRow);
  };

  // Ensure all baseline languages are represented in the adjacency matrix
  for (const language of merged.languages) {
    ensureLanguageInMatrix(language.name);
  }

  // Step 1: Process new references with meaningful IDs
  const allReferences: KCReference[] = [...baseline.languages.flatMap(l => l.references)];
  const existingRefIds = new Set(allReferences.map(r => r.id));
  const newRefIdMap = new Map<string, string>(); // Maps generated ID -> generated ID (for consistency)
  
  queue.newReferences.forEach((bibtex) => {
    const generatedId = generateReferenceId(bibtex, existingRefIds);
    existingRefIds.add(generatedId);
    
    const citationKey = extractCitationKey(bibtex);
    const ref: KCReference = {
      id: generatedId,
      title: citationKey || generatedId, // Use citation key as title if available
      href: '', // Would extract URL from bibtex
      bibtex
    };
    newRefIdMap.set(generatedId, generatedId);
    allReferences.push(ref);
  });

  // Helper to resolve reference IDs (identity function since IDs are already final)
  const resolveRefId = (refId: string): string => refId;

  // Step 2: Add new languages
  for (const langToAdd of queue.languagesToAdd) {
    // Resolve reference IDs in description
    const resolvedDescRefs = langToAdd.descriptionRefs.map(resolveRefId);
    
    // Resolve reference IDs in queries/transformations
    const resolvedQueries: typeof langToAdd.queries = {};
    for (const [code, support] of Object.entries(langToAdd.queries)) {
      resolvedQueries[code] = {
        ...support,
        refs: support.refs.map(resolveRefId)
      };
    }
    
    const resolvedTransformations: typeof langToAdd.transformations = {};
    for (const [code, support] of Object.entries(langToAdd.transformations)) {
      resolvedTransformations[code] = {
        ...support,
        refs: support.refs.map(resolveRefId)
      };
    }

    const kcLang = convertToKCLanguage(
      {
        ...langToAdd,
        descriptionRefs: resolvedDescRefs,
        queries: resolvedQueries,
        transformations: resolvedTransformations
      },
      allReferences
    );
    
    merged.languages.push(kcLang);
    ensureLanguageInMatrix(langToAdd.name);
  }

  // Step 3: Edit existing languages
  for (const langToEdit of queue.languagesToEdit) {
    const index = merged.languages.findIndex(l => l.name === langToEdit.name);
    if (index < 0) continue;
    
    // Resolve reference IDs
    const resolvedDescRefs = langToEdit.descriptionRefs.map(resolveRefId);
    
    const resolvedQueries: typeof langToEdit.queries = {};
    for (const [code, support] of Object.entries(langToEdit.queries)) {
      resolvedQueries[code] = {
        ...support,
        refs: support.refs.map(resolveRefId)
      };
    }
    
    const resolvedTransformations: typeof langToEdit.transformations = {};
    for (const [code, support] of Object.entries(langToEdit.transformations)) {
      resolvedTransformations[code] = {
        ...support,
        refs: support.refs.map(resolveRefId)
      };
    }

    const kcLang = convertToKCLanguage(
      {
        ...langToEdit,
        descriptionRefs: resolvedDescRefs,
        queries: resolvedQueries,
        transformations: resolvedTransformations
      },
      allReferences
    );
    
    merged.languages[index] = kcLang;
  }

  // Step 4: Update relationships in adjacency matrix
  // Only process relationships that were actually modified
  const modifiedSet = new Set(queue.modifiedRelations);
  
  for (const rel of queue.relationships) {
  ensureLanguageInMatrix(rel.sourceId);
  ensureLanguageInMatrix(rel.targetId);

    const sourceIdx = merged.adjacencyMatrix.indexByLanguage[rel.sourceId];
    const targetIdx = merged.adjacencyMatrix.indexByLanguage[rel.targetId];
    
    if (sourceIdx === undefined || targetIdx === undefined) continue;

    const relationKey = `${rel.sourceId}->${rel.targetId}`;
    if (modifiedSet.size > 0 && !modifiedSet.has(relationKey)) {
      const existing = merged.adjacencyMatrix.matrix[sourceIdx]?.[targetIdx];
      if (existing) {
        continue; // unchanged relationship already present
      }
    }
    
    // Resolve reference IDs
    const resolvedRefs = rel.refs.map(resolveRefId);
    const resolvedSepFns: SeparatingFunctionEntry[] = rel.separatingFunctions
      ? rel.separatingFunctions.map(fn => ({
          ...fn,
          refs: fn.refs.map(resolveRefId)
        }))
      : [];

    const relation: DirectedSuccinctnessRelation = {
      status: rel.status,
      refs: resolvedRefs,
      separatingFunctions: resolvedSepFns
    };

    merged.adjacencyMatrix.matrix[sourceIdx][targetIdx] = relation;
  }

  return merged;
}

/**
 * Check if there are queued changes in localStorage
 */
export function hasQueuedChanges(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem('kcm_contribute_queue_v1');
  return stored !== null;
}

/**
 * Load queued changes from localStorage
 */
export function loadQueuedChanges(): QueuedChanges | null {
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('kcm_contribute_queue_v1');
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      languagesToAdd: parsed.languagesToAdd || [],
      languagesToEdit: parsed.languagesToEdit || [],
      relationships: parsed.relationships || [],
      newReferences: parsed.newReferences || [],
      customTags: parsed.customTags || [],
      modifiedRelations: parsed.modifiedRelations || [],
      submissionId: typeof parsed.submissionId === 'string' ? parsed.submissionId : undefined,
      supersedesSubmissionId: typeof parsed.supersedesSubmissionId === 'string' ? parsed.supersedesSubmissionId : null
    };
  } catch (error) {
    console.error('Failed to load queued changes:', error);
    return null;
  }
}

/**
 * Clear queued changes from localStorage
 */
export function clearQueuedChanges(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('kcm_contribute_queue_v1');
  localStorage.removeItem('kcm_contributor_info_v1');
}

export interface ContributorInfo {
  email: string;
  github: string;
  note: string;
}

/**
 * Load contributor info from localStorage
 */
export function loadContributorInfo(): ContributorInfo | null {
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('kcm_contributor_info_v1');
    if (!stored) return null;
    
    return JSON.parse(stored) as ContributorInfo;
  } catch (error) {
    console.error('Failed to load contributor info:', error);
    return null;
  }
}
