import type { KCSeparatingFunction, SeparatingFunction } from '../types.js';
import database from './database.json';

// Build separating function map from JSON data (keyed by shortName)
const separatingFunctionsMap: Record<string, KCSeparatingFunction> = {};

const separatingFunctionsData = database.separatingFunctions as Array<KCSeparatingFunction>;

for (const sf of separatingFunctionsData) {
  separatingFunctionsMap[sf.shortName] = sf;
}

/**
 * Get a single separating function by shortName
 */
export function getSeparatingFunction(shortName: string): KCSeparatingFunction | undefined {
  return separatingFunctionsMap[shortName];
}

/**
 * Get multiple separating functions by shortNames
 * Filters out any shortNames that don't exist
 */
export function getSeparatingFunctions(...shortNames: string[]): KCSeparatingFunction[] {
  return shortNames.map(shortName => separatingFunctionsMap[shortName]).filter(Boolean);
}

/**
 * Convert a KCSeparatingFunction to a SeparatingFunction (same structure, type compatibility)
 * for use in contexts that expect the old format
 */
export function toSeparatingFunction(sf: KCSeparatingFunction): SeparatingFunction {
  return sf;
}

/**
 * Convert separating function shortNames to SeparatingFunction objects
 */
export function resolveSeparatingFunctionIds(shortNames: string[]): SeparatingFunction[] {
  return getSeparatingFunctions(...shortNames);
}

/**
 * All separating functions in the database
 */
export const allSeparatingFunctions = Object.values(separatingFunctionsMap);
