import type { KCOpEntry, KCOpSupportMap, KCLanguagePropertiesResolved } from '../types.js';

/**
 * Canonical definitions of all queries and transformations in the Knowledge Compilation Map.
 * This serves as the single source of truth for operation codes, labels, and descriptions.
 */

export interface KCOperation {
  code: string;
  label: string;
  description?: string;
}

/**
 * All possible query operations
 */
export const QUERIES: Record<string, KCOperation> = {
  CO: { code: 'CO', label: 'Consistency', description: 'Check if the formula is satisfiable' },
  VA: { code: 'VA', label: 'Validity', description: 'Check if the formula is a tautology' },
  CE: { code: 'CE', label: 'Clausal Entailment', description: 'Check if a clause is entailed' },
  IM: { code: 'IM', label: 'Implicant', description: 'Find an implicant of the formula' },
  EQ: { code: 'EQ', label: 'Equivalence', description: 'Check logical equivalence of two formulas' },
  SE: { code: 'SE', label: 'Sentential Entailment', description: 'Check if one formula entails another' },
  CT: { code: 'CT', label: 'Model Counting', description: 'Count the number of satisfying assignments' },
  ME: { code: 'ME', label: 'Model Enumeration', description: 'Enumerate all satisfying assignments' }
};

/**
 * All possible transformation operations
 */
export const TRANSFORMATIONS: Record<string, KCOperation> = {
  CD: { code: 'CD', label: 'Conditioning', description: 'Restrict formula given variable assignments' },
  FO: { code: 'FO', label: 'Forgetting', description: 'Existentially quantify out variables' },
  SFO: { code: 'SFO', label: 'Singleton Forgetting', description: 'Forget a single variable' },
  '∧C': { code: '∧C', label: 'Conjunction', description: 'Compute conjunction of formulas' },
  '∧BC': { code: '∧BC', label: 'Bounded Conjunction', description: 'Conjunction with bounded result size' },
  '∨C': { code: '∨C', label: 'Disjunction', description: 'Compute disjunction of formulas' },
  '∨BC': { code: '∨BC', label: 'Bounded Disjunction', description: 'Disjunction with bounded result size' },
  '¬C': { code: '¬C', label: 'Negation', description: 'Negate the formula' }
};

/**
 * Get all query operation codes
 */
export function getAllQueryCodes(): string[] {
  return Object.keys(QUERIES);
}

/**
 * Get all transformation operation codes
 */
export function getAllTransformationCodes(): string[] {
  return Object.keys(TRANSFORMATIONS);
}

/**
 * Resolve operation support map into full operation entries.
 * For operations not specified in the support map, they are marked as 'open' (open problem).
 */
export function resolveOperations(
  supportMap: KCOpSupportMap | undefined,
  operationDefs: Record<string, KCOperation>
): KCOpEntry[] {
  const result: KCOpEntry[] = [];
  
  for (const [code, opDef] of Object.entries(operationDefs)) {
    const support = supportMap?.[code];
    
    if (support) {
      // Operation explicitly specified
      result.push({
        code: opDef.code,
        label: opDef.label,
        polytime: support.polytime,
        note: support.note,
        refs: support.refs
      });
    } else {
      // Operation not specified - mark as open problem
      result.push({
        code: opDef.code,
        label: opDef.label,
        polytime: 'open',
        refs: []
      });
    }
  }
  
  return result;
}

/**
 * Resolve a language's properties into full operation entries for rendering.
 */
export function resolveLanguageProperties(
  queries?: KCOpSupportMap,
  transformations?: KCOpSupportMap
): KCLanguagePropertiesResolved {
  return {
    queries: resolveOperations(queries, QUERIES),
    transformations: resolveOperations(transformations, TRANSFORMATIONS)
  };
}
