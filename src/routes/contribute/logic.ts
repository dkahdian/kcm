import type { TransformationStatus } from '$lib/types.js';
import type { LanguageToAdd, SeparatingFunctionEntry, RelationshipEntry } from './types.js';
import { displayCodeToSafeKey } from '$lib/data/operations.js';

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
 * Helper function to format language data for submission
 */
export function formatLanguageForSubmission(lang: any) {
  return {
    id: lang.id,
    name: lang.name,
    fullName: lang.fullName,
    description: lang.description,
    descriptionRefs: Array.isArray(lang.descriptionRefs) ? [...lang.descriptionRefs] : [],
    properties: {
      queries: cloneOperationSupport(lang.queries),
      transformations: cloneOperationSupport(lang.transformations, true) // Convert to safe keys
    },
    tags: lang.tags ? JSON.parse(JSON.stringify(lang.tags)) : [],
    references: Array.isArray(lang.existingReferences) ? [...lang.existingReferences] : []
  };
}

/**
 * Build baseline relations from adjacency matrix
 */
export function buildBaselineRelations(adjacencyMatrix: {
  languageIds: string[];
  matrix: any[][];
}): Map<string, { status: TransformationStatus; refs: string[]; separatingFunctions: SeparatingFunctionEntry[] }> {
  const baselineRelations = new Map<
    string,
    { status: TransformationStatus; refs: string[]; separatingFunctions: SeparatingFunctionEntry[] }
  >();

  const { languageIds, matrix } = adjacencyMatrix;
  for (let i = 0; i < languageIds.length; i++) {
    for (let j = 0; j < languageIds.length; j++) {
      const relation = matrix[i][j];
      if (relation) {
        const sourceId = languageIds[i];
        const targetId = languageIds[j];
        baselineRelations.set(relationKey(sourceId, targetId), {
          status: relation.status,
          refs: relation.refs ? [...relation.refs] : [],
          separatingFunctions: relation.separatingFunctions
            ? relation.separatingFunctions.map((fn: any) => ({
                shortName: fn.shortName,
                name: fn.name,
                description: fn.description,
                refs: [...fn.refs]
              }))
            : []
        });
      }
    }
  }

  return baselineRelations;
}

/**
 * Get available reference IDs (existing + new)
 */
export function getAvailableReferenceIds(
  existingReferences: Array<{ id: string; title: string }>,
  newReferences: string[]
): string[] {
  const existing = existingReferences.map((r) => r.id);
  const newRefs = newReferences.map((_, index) => `new-${index}`);
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
  const newLangs = languagesToAdd.map((l) => ({ id: l.id, name: l.name }));
  const editedLangs = languagesToEdit.map((l) => ({ id: l.id, name: l.name }));
  return [...existing, ...newLangs, ...editedLangs];
}

/**
 * Convert KCLanguage to the format expected by AddLanguageModal
 */
export function convertLanguageForEdit(lang: any): LanguageToAdd {
  return {
    id: lang.id,
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
export function buildSubmissionPayload(
  contributorEmail: string,
  contributorGithub: string,
  languagesToAdd: LanguageToAdd[],
  languagesToEdit: LanguageToAdd[],
  changedRelationships: RelationshipEntry[],
  newReferences: string[],
  existingLanguageIds: string[]
) {
  const formattedRelationships = changedRelationships.map((rel) => ({
    sourceId: rel.sourceId,
    targetId: rel.targetId,
    status: rel.status,
    refs: rel.refs,
    separatingFunctions: rel.separatingFunctions || []
  }));

  const formattedLanguagesToAdd = languagesToAdd.map(formatLanguageForSubmission);
  const formattedLanguagesToEdit = languagesToEdit.map(formatLanguageForSubmission);

  return {
    contributorEmail,
    contributorGithub: contributorGithub || undefined,
    languagesToAdd: formattedLanguagesToAdd,
    languagesToEdit: formattedLanguagesToEdit,
    relationships: formattedRelationships,
    newReferences,
    existingLanguageIds
  };
}
