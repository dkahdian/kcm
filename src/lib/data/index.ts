import type { CanonicalKCData, LanguageFilter, EdgeFilter } from '../types.js';
import { canonicalDataset } from './canonical.js';
import { allPredefinedFilters, generateLanguageSelectionFilters, organizeFiltersByCategory, edgeFilters } from './filters/index.js';

// Export main GraphData object
export const initialGraphData: CanonicalKCData = canonicalDataset;

// Export all language filters combined (predefined + dynamic language selection)
export function getAllLanguageFilters(): LanguageFilter[] {
  const languageSelectionFilters = generateLanguageSelectionFilters(initialGraphData);
  return [...allPredefinedFilters, ...languageSelectionFilters];
}

// Export all edge filters
export function getAllEdgeFilters(): EdgeFilter[] {
  return edgeFilters;
}

// Re-export helper functions
export { organizeFiltersByCategory } from './filters/index.js';

// Re-export specific parts for convenience
export { relationTypes } from './relation-types.js';
export { allLanguages } from './languages.js';
export { allPredefinedFilters } from './filters/index.js';
export { edgeFilters } from './filters/index.js';
export { getAllTags, getTags, getTag, CANONICAL_TAGS } from './tags.js';
export { canonicalDataset } from './canonical.js';
export { 
  COMPLEXITIES,
  COMPLEXITY_CODES,
  getComplexity,
  getComplexityColor,
  getComplexityClass,
  getComplexityNotation,
  getComplexityDescription,
  getComplexityLabel,
  isValidComplexityCode,
  getAllComplexityCodes
} from './complexities.js';
