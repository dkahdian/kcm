import type { KCOpEntry, KCOpSupportMap, KCLanguagePropertiesResolved } from '../types.js';
import database from './database.json';

export interface KCOperation {
  code: string;
  label: string;
  description?: string;
}

const operationsData = database.operations as {
  queries: Record<string, KCOperation>;
  transformations: Record<string, KCOperation>;
};

export const QUERIES: Record<string, KCOperation> = operationsData.queries;
export const TRANSFORMATIONS: Record<string, KCOperation> = operationsData.transformations;

export function getAllQueryCodes(): string[] {
  return Object.keys(QUERIES);
}

export function getAllTransformationCodes(): string[] {
  return Object.keys(TRANSFORMATIONS);
}

export function displayCodeToSafeKey(code: string): string {
  for (const [safeKey, opDef] of Object.entries(TRANSFORMATIONS)) {
    if (opDef.code === code) {
      return safeKey;
    }
  }
  return code;
}

export function resolveOperations(
  supportMap: KCOpSupportMap | undefined,
  operationDefs: Record<string, KCOperation>
): KCOpEntry[] {
  const result: KCOpEntry[] = [];
  
  for (const [safeKey, opDef] of Object.entries(operationDefs)) {
    const support = supportMap?.[safeKey] || supportMap?.[opDef.code];
    
    if (support) {
      result.push({
        code: opDef.code,
        label: opDef.label,
        complexity: support.complexity,
        caveat: support.caveat,
        refs: support.refs,
        description: support.description,
        derived: support.derived
      });
    } else {
      result.push({
        code: opDef.code,
        label: opDef.label,
        complexity: 'unknown-to-us',
        refs: []
      });
    }
  }
  
  return result;
}

export function resolveLanguageProperties(
  queries?: KCOpSupportMap,
  transformations?: KCOpSupportMap
): KCLanguagePropertiesResolved {
  return {
    queries: resolveOperations(queries, QUERIES),
    transformations: resolveOperations(transformations, TRANSFORMATIONS)
  };
}
