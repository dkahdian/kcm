import type {
  CanonicalKCData,
  DirectedSuccinctnessRelation,
  KCAdjacencyMatrix,
  KCLanguage,
  KCOpSupport,
  KCSeparatingFunction,
  KCReference,
  TransformValidationResult
} from '../types.js';
import { getAllQueryCodes, getAllTransformationCodes, TRANSFORMATIONS } from './operations.js';
import { COMPLEXITIES, isValidComplexityCode } from './complexities.js';

const VALID_TRANSFORMATION_STATUSES: string[] = [
  'poly',
  'no-poly-unknown-quasi',
  'no-poly-quasi',
  'unknown-poly-quasi',
  'unknown-both',
  'no-quasi',
  'not-poly'
];

const VALID_COMPLEXITY_CODES = new Set(Object.keys(COMPLEXITIES));
const VALID_QUERY_CODES = new Set(getAllQueryCodes());
const VALID_TRANSFORMATION_CODES = new Set(getAllTransformationCodes());
const VALID_TRANSFORMATION_DISPLAY_CODES = new Set(
  Object.values(TRANSFORMATIONS).map((operation) => operation.code)
);

const LANGUAGE_ID_SANITIZER = /\$/g;

function normalizeLanguageId(value: string): string {
  return (value ?? '').replace(LANGUAGE_ID_SANITIZER, '').trim();
}

function ensureRefsExist(
  refs: unknown,
  context: string,
  knownRefs: Set<string>,
  errors: string[]
): void {
  if (refs === undefined) {
    return;
  }

  if (!Array.isArray(refs)) {
    errors.push(`${context}: references must be an array of IDs`);
    return;
  }

  for (const refId of refs) {
    if (typeof refId !== 'string' || !refId.trim()) {
      errors.push(`${context}: reference identifiers must be non-empty strings`);
      continue;
    }
    if (!knownRefs.has(refId)) {
      errors.push(`${context}: unknown reference "${refId}"`);
    }
  }
}

function collectLanguageIdentifiers(languages: KCLanguage[], errors: string[]): Map<string, string> {
  const identifiers = new Map<string, string>();
  for (const language of languages) {
    if (!language.id || typeof language.id !== 'string') {
      errors.push(`Encountered language without a valid id (name: ${language.name})`);
      continue;
    }
    if (!language.name || typeof language.name !== 'string') {
      errors.push('Encountered language without a valid name');
      continue;
    }
    const normalized = normalizeLanguageId(language.id);
    if (!normalized) {
      errors.push(`Language "${language.name}" (id: "${language.id}") resolves to an empty identifier after normalization`);
      continue;
    }
    if (identifiers.has(normalized)) {
      const collision = identifiers.get(normalized);
      errors.push(
        `Language ID collision: "${language.id}" (${language.name}) conflicts with "${collision}" after normalization`
      );
    } else {
      identifiers.set(normalized, language.name);
    }
  }
  return identifiers;
}

function collectReferenceRegistry(references: KCReference[] | undefined): Set<string> {
  const registry = new Set<string>();
  if (!references) return registry;
  for (const reference of references) {
    if (reference?.id) {
      registry.add(reference.id);
    }
  }
  return registry;
}

function validateAdjacencyMatrix(
  matrix: KCAdjacencyMatrix,
  knownLanguages: Map<string, string>,
  errors: string[]
): void {
  const { languageIds, indexByLanguage, matrix: relations } = matrix;
  const adjacencyIdentifiers = new Map<string, number>();

  languageIds.forEach((languageId, idx) => {
    const normalized = normalizeLanguageId(languageId);
    if (!normalized) {
      errors.push(`Adjacency matrix entry at index ${idx} has an empty identifier`);
      return;
    }
    if (adjacencyIdentifiers.has(normalized)) {
      const conflictIdx = adjacencyIdentifiers.get(normalized);
      errors.push(
        `Adjacency matrix contains duplicate identifier "${languageId}" (conflicts with index ${conflictIdx})`
      );
    } else {
      adjacencyIdentifiers.set(normalized, idx);
    }
    if (!knownLanguages.has(normalized)) {
      errors.push(`Adjacency matrix references unknown language "${languageId}"`);
    }
  });

  for (const [normalized, original] of knownLanguages.entries()) {
    if (!adjacencyIdentifiers.has(normalized)) {
      errors.push(`Language "${original}" is missing from the adjacency matrix`);
    }
  }

  if (relations.length !== languageIds.length) {
    errors.push('Adjacency matrix must be square (rows must match number of languages)');
  }

  languageIds.forEach((_id, idx) => {
    const row = relations[idx];
    if (!Array.isArray(row)) {
      errors.push(`Adjacency matrix row ${idx} is not an array`);
      return;
    }
    if (row.length !== languageIds.length) {
      errors.push(`Adjacency matrix row ${idx} length (${row.length}) does not match language count (${languageIds.length})`);
    }
  });

  const indexEntries = Object.entries(indexByLanguage);
  if (indexEntries.length !== languageIds.length) {
    errors.push('Adjacency matrix indexByLanguage must map every language exactly once');
  }
  for (const [languageId, idx] of indexEntries) {
    if (typeof idx !== 'number' || Number.isNaN(idx)) {
      errors.push(`indexByLanguage entry for "${languageId}" is not a valid number`);
      continue;
    }
    if (idx < 0 || idx >= languageIds.length) {
      errors.push(`indexByLanguage entry for "${languageId}" is out of bounds (${idx})`);
      continue;
    }
    if (languageIds[idx] !== languageId) {
      errors.push(`indexByLanguage mismatch: position ${idx} stores "${languageIds[idx]}" instead of "${languageId}"`);
    }
  }
}

function validateOperationMap(
  languageName: string,
  kind: 'query' | 'transformation',
  operations: Record<string, KCOpSupport> | undefined,
  knownRefs: Set<string>,
  errors: string[]
): void {
  if (!operations) return;
  for (const [code, support] of Object.entries(operations)) {
    const validCodes = kind === 'query' ? VALID_QUERY_CODES : VALID_TRANSFORMATION_CODES;
    const displayCodeSet = kind === 'query' ? undefined : VALID_TRANSFORMATION_DISPLAY_CODES;
    if (!validCodes.has(code) && !(displayCodeSet?.has(code))) {
      errors.push(`Language "${languageName}" references unknown ${kind} code "${code}"`);
    }

    if (!support || typeof support.polytime !== 'string' || !VALID_COMPLEXITY_CODES.has(support.polytime)) {
      errors.push(
        `Language "${languageName}" ${kind} "${code}" must have a valid complexity code`
      );
    }

    ensureRefsExist(
      support?.refs,
      `Language "${languageName}" ${kind} "${code}" refs`,
      knownRefs,
      errors
    );
  }
}

function validateLanguage(
  language: KCLanguage,
  knownLanguages: Map<string, string>,
  globalRefs: Set<string>,
  errors: string[]
): void {
  if (Array.isArray(language.references)) {
    for (const reference of language.references) {
      if (!reference?.id) {
        errors.push(`Language "${language.name}" contains a reference without an id`);
        continue;
      }
      if (!globalRefs.has(reference.id)) {
        errors.push(`Language "${language.name}" references unknown id "${reference.id}"`);
      }
    }
  }

  ensureRefsExist(language.descriptionRefs, `Language "${language.name}" descriptionRefs`, globalRefs, errors);

  validateOperationMap(language.name, 'query', language.properties?.queries, globalRefs, errors);
  validateOperationMap(language.name, 'transformation', language.properties?.transformations, globalRefs, errors);

  if (Array.isArray(language.tags)) {
    const seenLabels = new Set<string>();
    for (const tag of language.tags) {
      if (!tag?.label) {
        errors.push(`Language "${language.name}" has a tag without a label`);
        continue;
      }
      if (seenLabels.has(tag.label)) {
        errors.push(`Language "${language.name}" has duplicate tag label "${tag.label}"`);
      } else {
        seenLabels.add(tag.label);
      }
      ensureRefsExist(tag.refs, `Language "${language.name}" tag "${tag.label}" refs`, globalRefs, errors);
    }
  }

  if (Array.isArray(language.subsets)) {
    for (const subsetId of language.subsets) {
      const normalized = normalizeLanguageId(subsetId);
      if (!normalized || !knownLanguages.has(normalized)) {
        errors.push(`Language "${language.name}" subset "${subsetId}" does not reference a known language`);
      }
    }
  }
}

function validateSeparatingFunctions(
  separatingFunctions: KCSeparatingFunction[],
  knownRefs: Set<string>,
  errors: string[]
): Set<string> {
  const ids = new Set<string>();
  for (const fn of separatingFunctions) {
    if (!fn.shortName) {
      errors.push('Separating function is missing a shortName');
      continue;
    }
    if (ids.has(fn.shortName)) {
      errors.push(`Duplicate separating function shortName "${fn.shortName}"`);
    } else {
      ids.add(fn.shortName);
    }
    ensureRefsExist(fn.refs, `Separating function "${fn.shortName}" refs`, knownRefs, errors);
  }
  return ids;
}

function validateRelation(
  relation: DirectedSuccinctnessRelation,
  sourceId: string,
  targetId: string,
  knownRefs: Set<string>,
  separatingFunctionIds: Set<string>,
  errors: string[]
): void {
  if (!VALID_TRANSFORMATION_STATUSES.includes(relation.status)) {
    errors.push(`Edge ${sourceId} -> ${targetId} has unknown status "${relation.status}"`);
  }

  ensureRefsExist(relation.refs, `Edge ${sourceId} -> ${targetId} refs`, knownRefs, errors);

  if (relation.separatingFunctionIds !== undefined) {
    if (!Array.isArray(relation.separatingFunctionIds)) {
      errors.push(`Edge ${sourceId} -> ${targetId}: separatingFunctionIds must be an array`);
    } else {
      for (const fnId of relation.separatingFunctionIds) {
        if (typeof fnId !== 'string' || !fnId.trim()) {
          errors.push(`Edge ${sourceId} -> ${targetId}: separatingFunctionIds must contain string IDs`);
          continue;
        }
        if (!separatingFunctionIds.has(fnId)) {
          errors.push(`Edge ${sourceId} -> ${targetId} references unknown separating function "${fnId}"`);
        }
      }
    }
  }

  if (relation.separatingFunctions !== undefined) {
    if (!Array.isArray(relation.separatingFunctions)) {
      errors.push(`Edge ${sourceId} -> ${targetId}: separatingFunctions must be an array`);
    } else {
      for (const fn of relation.separatingFunctions) {
        if (!fn?.shortName) {
          errors.push(`Edge ${sourceId} -> ${targetId}: separating functions must include shortName`);
        }
        if (!fn?.name) {
          errors.push(`Edge ${sourceId} -> ${targetId}: separating functions must include name`);
        }
        if (!fn?.description) {
          errors.push(`Edge ${sourceId} -> ${targetId}: separating functions must include description`);
        }
        ensureRefsExist(fn?.refs, `Edge ${sourceId} -> ${targetId} separating function "${fn?.shortName ?? 'unknown'}" refs`, knownRefs, errors);
      }
    }
  }
}

function validateRelations(
  matrix: KCAdjacencyMatrix,
  knownRefs: Set<string>,
  separatingFunctionIds: Set<string>,
  errors: string[]
): void {
  const { languageIds, matrix: relations } = matrix;
  for (let i = 0; i < languageIds.length; i += 1) {
    for (let j = 0; j < languageIds.length; j += 1) {
      const relation = relations[i]?.[j];
      if (!relation) continue;
      validateRelation(relation, languageIds[i], languageIds[j], knownRefs, separatingFunctionIds, errors);
    }
  }
}

export function validateDatasetStructure(data: CanonicalKCData): TransformValidationResult {
  const errors: string[] = [];
  const knownLanguages = collectLanguageIdentifiers(data.languages, errors);
  validateAdjacencyMatrix(data.adjacencyMatrix, knownLanguages, errors);

  const globalReferenceRegistry = collectReferenceRegistry(data.references);
  for (const language of data.languages) {
    validateLanguage(language, knownLanguages, globalReferenceRegistry, errors);
  }

  const separatingFunctionIds = validateSeparatingFunctions(data.separatingFunctions ?? [], globalReferenceRegistry, errors);
  validateRelations(data.adjacencyMatrix, globalReferenceRegistry, separatingFunctionIds, errors);

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
