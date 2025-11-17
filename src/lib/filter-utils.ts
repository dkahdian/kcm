import type { 
  GraphData, 
  LanguageFilter, 
  EdgeFilter,
  FilteredGraphData, 
  KCLanguage, 
  FilterStateMap, 
  FilterParamValue,
  KCAdjacencyMatrix,
  DirectedSuccinctnessRelation
} from './types.js';

/**
 * Applies filters using their parameter values from the filter state map.
 * Pipeline:
 * 1. Apply all node/language filters
 * 2. Remove edges connected to hidden nodes
 * 3. Apply all edge filters
 */
export function applyFiltersWithParams(
  graphData: GraphData, 
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[],
  filterStates: FilterStateMap
): FilteredGraphData {
  // Step 1: Transform each language through the language filter pipeline
  const transformedLanguages: KCLanguage[] = [];
  
  for (const language of graphData.languages) {
    let current: KCLanguage | null = language;
    
    // Apply each language filter in sequence with its parameter value
    for (const filter of languageFilters) {
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

  const visibleLanguageIds = new Set(transformedLanguages.map(l => l.name));

  // Step 2 & 3: Filter edges
  // First, build a new adjacency matrix with only visible nodes
  // Then apply edge filters to remaining edges
  const filteredMatrix = filterAdjacencyMatrix(
    graphData.adjacencyMatrix,
    visibleLanguageIds,
    edgeFilters,
    filterStates
  );

  // Build set of visible edge IDs
  const visibleEdgeIds = new Set<string>();
  for (let i = 0; i < filteredMatrix.languageIds.length; i++) {
    for (let j = 0; j < filteredMatrix.languageIds.length; j++) {
      if (filteredMatrix.matrix[i][j] !== null) {
        const sourceId = filteredMatrix.languageIds[i];
        const targetId = filteredMatrix.languageIds[j];
        visibleEdgeIds.add(`${sourceId}->${targetId}`);
      }
    }
  }

  return {
    ...graphData,
    languages: transformedLanguages,
    adjacencyMatrix: filteredMatrix,
    visibleLanguageIds,
    visibleEdgeIds
  };
}

/**
 * Filters the adjacency matrix:
 * 1. Remove edges connected to hidden nodes
 * 2. Apply edge filters to remaining edges
 */
function filterAdjacencyMatrix(
  originalMatrix: KCAdjacencyMatrix,
  visibleLanguageIds: Set<string>,
  edgeFilters: EdgeFilter[],
  filterStates: FilterStateMap
): KCAdjacencyMatrix {
  // Build new matrix with only visible languages
  const visibleLanguages = originalMatrix.languageIds.filter(id => visibleLanguageIds.has(id));
  const newIndexByLanguage: Record<string, number> = {};
  visibleLanguages.forEach((id, idx) => {
    newIndexByLanguage[id] = idx;
  });

  // Initialize new matrix
  const newMatrix: (DirectedSuccinctnessRelation | null)[][] = Array(visibleLanguages.length)
    .fill(null)
    .map(() => Array(visibleLanguages.length).fill(null));

  // Copy edges from original matrix, but only for visible nodes
  for (let i = 0; i < visibleLanguages.length; i++) {
    const sourceId = visibleLanguages[i];
    const sourceOldIdx = originalMatrix.indexByLanguage[sourceId];
    
    for (let j = 0; j < visibleLanguages.length; j++) {
      const targetId = visibleLanguages[j];
      const targetOldIdx = originalMatrix.indexByLanguage[targetId];
      
      let relation = originalMatrix.matrix[sourceOldIdx][targetOldIdx];
      
      // Apply edge filters to this relation
      if (relation !== null) {
        for (const filter of edgeFilters) {
          if (relation === null) break; // Already hidden by a previous filter
          
          const param = filterStates.get(filter.id) ?? filter.defaultParam;
          relation = filter.lambda(relation, sourceId, targetId, param as any);
        }
      }
      
      newMatrix[i][j] = relation;
    }
  }

  return {
    languageIds: visibleLanguages,
    indexByLanguage: newIndexByLanguage,
    matrix: newMatrix
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
  
  // Get all unique filters (no edge filters in legacy mode)
  return applyFiltersWithParams(graphData, activeFilters, [], filterStates);
}

/**
 * Creates initial filter state map with all filters set to their defaults
 */
export function createDefaultFilterState(
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[] = []
): FilterStateMap {
  const stateMap: FilterStateMap = new Map();
  for (const filter of languageFilters) {
    stateMap.set(filter.id, filter.defaultParam);
  }
  for (const filter of edgeFilters) {
    stateMap.set(filter.id, filter.defaultParam);
  }
  return stateMap;
}