import type { KCSeparatingFunction } from '../types.js';
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
 * All separating functions in the database
 */
export const allSeparatingFunctions = Object.values(separatingFunctionsMap);
