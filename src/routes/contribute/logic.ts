import type { TransformationStatus } from '$lib/types.js';
import type { LanguageToAdd, SeparatingFunctionEntry, RelationshipEntry } from './types.js';
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
        polytime: support.polytime,
        note: support.note,
        refs: Array.isArray(support.refs) ? [...support.refs] : []
      };
    }
  }
  return cloned;
}

/**
 * Build baseline relations from adjacency matrix
 */
export function buildBaselineRelations(adjacencyMatrix: {
  languageIds: string[];
  matrix: any[][];
}): Map<string, { status: TransformationStatus; refs: string[]; separatingFunctionIds?: string[]; separatingFunctions: SeparatingFunctionEntry[] }> {
  const baselineRelations = new Map<
    string,
    { status: TransformationStatus; refs: string[]; separatingFunctionIds?: string[]; separatingFunctions: SeparatingFunctionEntry[] }
  >();

  const { languageIds, matrix } = adjacencyMatrix;
  for (let i = 0; i < languageIds.length; i++) {
    for (let j = 0; j < languageIds.length; j++) {
      const relation = matrix[i][j];
      if (relation) {
        const sourceId = languageIds[i];
        const targetId = languageIds[j];
        
        // Support both old format (separatingFunctions array) and new format (separatingFunctionIds)
        let separatingFunctionIds: string[] | undefined = undefined;
        let separatingFunctions: SeparatingFunctionEntry[] = [];
        
        if (relation.separatingFunctionIds && Array.isArray(relation.separatingFunctionIds)) {
          separatingFunctionIds = [...relation.separatingFunctionIds];
        } else if (relation.separatingFunctions && Array.isArray(relation.separatingFunctions)) {
          separatingFunctions = relation.separatingFunctions.map((fn: any) => ({
            shortName: fn.shortName,
            name: fn.name,
            description: fn.description,
            refs: [...fn.refs]
          }));
        }
        
        baselineRelations.set(relationKey(sourceId, targetId), {
          status: relation.status,
          refs: relation.refs ? [...relation.refs] : [],
          separatingFunctionIds,
          separatingFunctions
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
  newReferences: string[]
): string[] {
  const existing = existingReferences.map((r) => r.id);
  const existingSet = new Set(existing);
  
  const newRefs = newReferences.map((bibtex) => {
    const newId = generateReferenceId(bibtex, existingSet);
    existingSet.add(newId); // Add to set to prevent duplicates within new references
    return newId;
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
