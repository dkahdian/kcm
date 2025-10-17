import type { GraphData, LanguageFilter } from '../types.js';
import { relationTypes } from './relation-types.js';
import { allLanguages } from './languages/index.js';
import { edges } from './edges.js';
import { allPredefinedFilters, generateLanguageSelectionFilters, organizeFiltersByCategory } from './filters/index.js';

// Export main GraphData object
export const initialGraphData: GraphData = {
  relationTypes,
  languages: allLanguages,
  edges
};

// Export all filters combined (predefined + dynamic language selection)
export function getAllFilters(): LanguageFilter[] {
  const languageSelectionFilters = generateLanguageSelectionFilters(initialGraphData);
  return [...allPredefinedFilters, ...languageSelectionFilters];
}

// Re-export helper functions
export { organizeFiltersByCategory } from './filters/index.js';

// Re-export specific parts for convenience
export { relationTypes } from './relation-types.js';
export { allLanguages } from './languages/index.js';
export { allPredefinedFilters } from './filters/index.js';
