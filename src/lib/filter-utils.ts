import type { GraphData, LanguageFilter, FilteredGraphData, KCLanguage } from './types.js';

/**
 * Applies a set of active filters to the graph data
 * A language is shown only if it satisfies ALL active filters
 */
export function applyFilters(
  graphData: GraphData, 
  activeFilters: LanguageFilter[]
): FilteredGraphData {
  // If no filters are active, show everything
  if (activeFilters.length === 0) {
    const allLanguageIds = new Set(graphData.languages.map(l => l.id));
    return {
      ...graphData,
      visibleLanguageIds: allLanguageIds,
      visibleRelations: graphData.relations
    };
  }

  // Apply all filters - a language must satisfy ALL active filters
  const visibleLanguages = graphData.languages.filter(language => {
    return activeFilters.every(filter => filter.filterFn(language));
  });

  const visibleLanguageIds = new Set(visibleLanguages.map(l => l.id));

  // Filter relations - only show edges between visible languages
  const visibleRelations = graphData.relations.filter(relation => {
    return visibleLanguageIds.has(relation.source) && visibleLanguageIds.has(relation.target);
  });

  return {
    ...graphData,
    visibleLanguageIds,
    visibleRelations
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