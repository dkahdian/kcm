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
 * Parse BibTeX entry to extract author and year for generating reference ID
 */
function parseBibtexForId(bibtex: string): { author: string; year: string } | null {
  // Try to extract author - look for author = {...} or author = "..."
  const authorMatch = bibtex.match(/author\s*=\s*[{"']([^}"']+)[}"']/i);
  let author = 'Unknown';
  
  if (authorMatch) {
    const authorStr = authorMatch[1];
    // Extract last name - handle "Last, First" or "First Last" format
    // Also handle multiple authors by taking the first one
    const firstAuthor = authorStr.split(/\s+and\s+/i)[0].trim();
    
    // Check if it's "Last, First" format
    if (firstAuthor.includes(',')) {
      author = firstAuthor.split(',')[0].trim();
    } else {
      // Assume "First Last" format - take the last word
      const words = firstAuthor.trim().split(/\s+/);
      author = words[words.length - 1];
    }
    
    // Clean up any remaining braces or special characters
    author = author.replace(/[{}]/g, '').trim();
  }
  
  // Try to extract year
  const yearMatch = bibtex.match(/year\s*=\s*[{"']?(\d{4})[}"']?/i);
  const year = yearMatch ? yearMatch[1] : 'XXXX';
  
  return { author, year };
}

/**
 * Generate a reference ID from BibTeX (format: Author_Year)
 */
export function generateReferenceId(bibtex: string, existingIds: Set<string>): string {
  const parsed = parseBibtexForId(bibtex);
  
  if (!parsed) {
    // Fallback to generic ID if parsing fails
    let fallbackId = 'Reference_Unknown';
    let counter = 1;
    while (existingIds.has(fallbackId)) {
      fallbackId = `Reference_Unknown_${counter}`;
      counter++;
    }
    return fallbackId;
  }
  
  const baseId = `${parsed.author}_${parsed.year}`;
  
  // Check for duplicates and append suffix if needed
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  
  // Try with suffixes: _a, _b, _c, etc.
  const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (const suffix of suffixes) {
    const idWithSuffix = `${baseId}_${suffix}`;
    if (!existingIds.has(idWithSuffix)) {
      return idWithSuffix;
    }
  }
  
  // If all 26 letters are taken, fall back to numbers
  let counter = 1;
  while (existingIds.has(`${baseId}_${counter}`)) {
    counter++;
  }
  return `${baseId}_${counter}`;
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
  contributorNote: string,
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
    contributorNote: contributorNote || undefined,
    languagesToAdd: formattedLanguagesToAdd,
    languagesToEdit: formattedLanguagesToEdit,
    relationships: formattedRelationships,
    newReferences,
    existingLanguageIds
  };
}
