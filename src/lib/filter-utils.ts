import type { GraphData, LanguageFilter, FilteredGraphData, KCLanguage } from './types.js';

/**
 * Applies a set of active filters to the graph data.
 * Each filter transforms a language or returns null to hide it.
 * Filters are applied in sequence (composed/chained).
 */
export function applyFilters(
  graphData: GraphData, 
  activeFilters: LanguageFilter[]
): FilteredGraphData {
  // Transform each language through the filter pipeline
  const transformedLanguages: KCLanguage[] = [];
  
  for (const language of graphData.languages) {
    let current: KCLanguage | null = language;
    
    // Apply each filter in sequence
    for (const filter of activeFilters) {
      if (current === null) break; // Already hidden by a previous filter
      current = filter.lambda(current);
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
 * Applies a single filter to get filtered data
 */
export function applyFilter(
  graphData: GraphData, 
  filter: LanguageFilter | null
): FilteredGraphData {
  return applyFilters(graphData, filter ? [filter] : []);
}