import type { GraphData, LanguageFilter, FilteredGraphData, KCLanguage, FilterStateMap, FilterParamValue } from './types.js';

/**
 * Applies filters using their parameter values from the filter state map.
 * Each filter transforms a language or returns null to hide it.
 * Filters are applied in sequence (composed/chained).
 */
export function applyFiltersWithParams(
  graphData: GraphData, 
  allFilters: LanguageFilter[],
  filterStates: FilterStateMap
): FilteredGraphData {
  // Transform each language through the filter pipeline
  const transformedLanguages: KCLanguage[] = [];
  
  for (const language of graphData.languages) {
    let current: KCLanguage | null = language;
    
    // Apply each filter in sequence with its parameter value
    for (const filter of allFilters) {
      if (current === null) break; // Already hidden by a previous filter
      
      // Get the parameter value for this filter (or use default)
      const param = filterStates.get(filter.id) ?? filter.defaultParam;
      current = filter.lambda(current, param as any);
    }
    
    // If language survived all filters, include it
    if (current !== null) {
      transformedLanguages.push(current);
    }
  }

  const visibleLanguageIds = new Set(transformedLanguages.map(l => l.id));

  return {
    ...graphData,
    languages: transformedLanguages,
    visibleLanguageIds
  };
}

/**
 * Legacy compatibility: Applies filters that are "active" (assuming boolean params)
 * @deprecated Use applyFiltersWithParams instead
 */
export function applyFilters(
  graphData: GraphData, 
  activeFilters: LanguageFilter[]
): FilteredGraphData {
  // Create a filter state map from active filters
  const filterStates: FilterStateMap = new Map();
  for (const filter of activeFilters) {
    filterStates.set(filter.id, true);
  }
  
  // Get all unique filters
  return applyFiltersWithParams(graphData, activeFilters, filterStates);
}

/**
 * Creates initial filter state map with all filters set to their defaults
 */
export function createDefaultFilterState(filters: LanguageFilter[]): FilterStateMap {
  const stateMap: FilterStateMap = new Map();
  for (const filter of filters) {
    stateMap.set(filter.id, filter.defaultParam);
  }
  return stateMap;
}