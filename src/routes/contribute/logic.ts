import type { LanguageToAdd, RelationshipEntry, ReferenceToAdd } from './types.js';
import { displayCodeToSafeKey } from '$lib/data/operations.js';
import { generateReferenceId } from '$lib/utils/reference-id.js';
import { generateLanguageId } from '$lib/utils/language-id.js';

/**
 * Generate a unique key for a relationship
 */
export function relationKey(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

/**
 * Helper function to clone operation support maps and convert display codes to safe keys
 */
export function cloneOperationSupport(
  operations: Record<string, any> | undefined,
  convertToSafeKeys = false
): Record<string, any> {
  const cloned: Record<string, any> = {};
  if (operations) {
    for (const [code, support] of Object.entries(operations)) {
      const key = convertToSafeKeys ? displayCodeToSafeKey(code) : code;
      cloned[key] = {
        complexity: support.complexity,
        note: support.note,
        refs: Array.isArray(support.refs) ? [...support.refs] : []
      };
    }
  }
  return cloned;
}

export interface BaselineRelation {
  status: string;
  description?: string;
  refs: string[];
  separatingFunctionIds?: string[];
  derived?: boolean;
}

/**
 * Build baseline relations from adjacency matrix
 */
export function buildBaselineRelations(adjacencyMatrix: {
  languageIds: string[];
  matrix: any[][];
}): Map<string, BaselineRelation> {
  const baselineRelations = new Map<string, BaselineRelation>();

  const { languageIds, matrix } = adjacencyMatrix;
  for (let i = 0; i < languageIds.length; i++) {
    for (let j = 0; j < languageIds.length; j++) {
      const relation = matrix[i][j];
      if (relation) {
        const sourceId = languageIds[i];
        const targetId = languageIds[j];
        
        const separatingFunctionIds = relation.separatingFunctionIds && Array.isArray(relation.separatingFunctionIds)
          ? [...relation.separatingFunctionIds]
          : undefined;
        
        baselineRelations.set(relationKey(sourceId, targetId), {
          status: relation.status,
          description: relation.description,
          refs: relation.refs ? [...relation.refs] : [],
          separatingFunctionIds,
          derived: relation.derived
        });
      }
    }
  }

  return baselineRelations;
}

/**
 * Get available reference IDs (existing + new with meaningful names)
 */
export function getAvailableReferenceIds(
  existingReferences: Array<{ id: string; title: string }>,
  newReferences: ReferenceToAdd[]
): string[] {
  const existing = existingReferences.map((r) => r.id);
  const existingSet = new Set(existing);
  
  const newRefs = newReferences.map((ref) => {
    const newId = generateReferenceId(ref.bibtex, existingSet);
    existingSet.add(newId); // Add to set to prevent duplicates within new references
    return newId;
  });
  
  return [...existing, ...newRefs];
}

/**
 * Reference data with tooltip information
 */
export type ReferenceForTooltip = {
  id: string;
  title: string;
  bibtex: string;
};

/**
 * Get available references with full tooltip data (existing + new)
 */
export function getAvailableReferences(
  existingReferences: Array<{ id: string; title: string; bibtex: string }>,
  newReferences: ReferenceToAdd[]
): ReferenceForTooltip[] {
  const existingSet = new Set(existingReferences.map((r) => r.id));
  
  const existing: ReferenceForTooltip[] = existingReferences.map((r) => ({
    id: r.id,
    title: r.title,
    bibtex: r.bibtex
  }));
  
  const newRefs: ReferenceForTooltip[] = newReferences.map((ref) => {
    const newId = generateReferenceId(ref.bibtex, existingSet);
    existingSet.add(newId);
    return { id: newId, title: ref.title, bibtex: ref.bibtex };
  });
  
  return [...existing, ...newRefs];
}

/**
 * Get available languages (existing + new + edited)
 */
export function getAvailableLanguages(
  existingLanguages: Array<{ id: string; name: string }>,
  languagesToAdd: LanguageToAdd[],
  languagesToEdit: LanguageToAdd[]
): Array<{ id: string; name: string }> {
  const existing = existingLanguages.map((l) => ({ id: l.id, name: l.name }));
  const newLangs = languagesToAdd.map((l) => ({ id: generateLanguageId(l.name), name: l.name }));
  const editedLangs = languagesToEdit.map((l) => ({ id: generateLanguageId(l.name), name: l.name }));
  return [...existing, ...newLangs, ...editedLangs];
}

/**
 * Convert KCLanguage to the format expected by AddLanguageModal
 */
export function convertLanguageForEdit(lang: any): LanguageToAdd {
  return {
    name: lang.name,
    fullName: lang.fullName || '',
    description: lang.description || '',
    descriptionRefs: lang.descriptionRefs || [],
    queries: lang.properties?.queries || {},
    transformations: lang.properties?.transformations || {},
    tags: (lang.tags || []).map((t: any) => ({ ...t, color: t.color || '#6366f1' })),
    existingReferences: lang.references?.map((r: any) => r.id) || []
  };
}

/**
 * Validate submission has content
 */
export function validateSubmission(
  languagesToAdd: LanguageToAdd[],
  languagesToEdit: LanguageToAdd[],
  changedRelationships: RelationshipEntry[],
  newReferences: string[]
): string | null {
  if (
    languagesToAdd.length === 0 &&
    languagesToEdit.length === 0 &&
    changedRelationships.length === 0 &&
    newReferences.length === 0
  ) {
    return 'Please add at least one item (language, reference, or relationship) before submitting.';
  }
  return null;
}

/**
 * Build submission payload
 */
/**
 * Get available separating functions (existing + new) for dropdown selection
 */
export function getAvailableSeparatingFunctions(
  existingSeparatingFunctions: Array<{ shortName: string; name: string; description: string }>,
  newSeparatingFunctions: Array<{ shortName: string; name: string; description: string }>
): Array<{ shortName: string; name: string; description: string }> {
  const existing = existingSeparatingFunctions.map((sf) => ({
    shortName: sf.shortName,
    name: sf.name,
    description: sf.description
  }));
  const newSFs = newSeparatingFunctions.map((sf) => ({
    shortName: sf.shortName,
    name: sf.name,
    description: sf.description
  }));
  return [...existing, ...newSFs];
}
