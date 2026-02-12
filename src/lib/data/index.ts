import type { GraphData, DataFilter } from '../types.js';
import { canonicalDataset } from './canonical.js';
import { allPredefinedFilters, generateLanguageSelectionFilters, organizeFiltersByCategory, edgeFilters } from './filters/index.js';

// Export main GraphData object
export const initialGraphData: GraphData = canonicalDataset;

// Export all language filters combined (predefined + dynamic language selection)
export function getAllLanguageFilters(): DataFilter[] {
  const languageSelectionFilters = generateLanguageSelectionFilters(initialGraphData);
  return [...allPredefinedFilters, ...languageSelectionFilters];
}

// Export all edge filters
export function getAllEdgeFilters(): DataFilter[] {
  return edgeFilters;
}

// Re-export helper functions
export { organizeFiltersByCategory } from './filters/index.js';

// Re-export specific parts for convenience
export { relationTypes } from './complexities.js';
export { allLanguages } from './languages.js';
export { allPredefinedFilters } from './filters/index.js';
export { edgeFilters } from './filters/index.js';
export { getAllTags, getTags, getTag, CANONICAL_TAGS } from './tags.js';
export { canonicalDataset } from './canonical.js';
export { 
  COMPLEXITIES,
  getComplexity,
  isValidComplexityCode
} from './complexities.js';
