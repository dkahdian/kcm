// Export all filter modules
export { propertyFilters } from './property-filters.js';
export { queryVisualizationFilters } from './query-visualizations.js';
export { transformationVisualizationFilters } from './transformation-visualizations.js';
export { edgeFilters } from './edge-filters.js';
export { 
  createOperationVisualizer, 
  generateLanguageSelectionFilters, 
  organizeFiltersByCategory,
  createFillUnknownOperationsFilter 
} from './helpers.js';

// Convenience array of all predefined filters (excluding dynamic language selection filters)
import { propertyFilters } from './property-filters.js';
import { queryVisualizationFilters } from './query-visualizations.js';
import { transformationVisualizationFilters } from './transformation-visualizations.js';
import { createFillUnknownOperationsFilter } from './helpers.js';
import type { LanguageFilter } from '../../types.js';

export const allPredefinedFilters: LanguageFilter[] = [
  createFillUnknownOperationsFilter(), // Hidden internal filter
  ...propertyFilters,
  ...queryVisualizationFilters,
  ...transformationVisualizationFilters
];
