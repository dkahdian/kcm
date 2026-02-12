import type { KCSeparatingFunction } from '../types.js';
import database from './database.json';

// Build separating function map from JSON data (keyed by shortName)
const separatingFunctionsMap: Record<string, KCSeparatingFunction> = {};

const separatingFunctionsData = database.separatingFunctions as Array<KCSeparatingFunction>;

for (const sf of separatingFunctionsData) {
  separatingFunctionsMap[sf.shortName] = sf;
}

/**
 * All separating functions in the database
 */
export const allSeparatingFunctions = Object.values(separatingFunctionsMap);
