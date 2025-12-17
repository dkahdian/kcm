import type { 
  GraphData, 
  LanguageFilter, 
  EdgeFilter,
  FilteredGraphData, 
  FilterStateMap, 
  FilterParamValue,
  KCAdjacencyMatrix
} from './types.js';
import { transformData } from './data/transforms.js';

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
  const dataset = {
    ...graphData,
    separatingFunctions: graphData.separatingFunctions ?? []
  } as GraphData;
  const transformStage = (current: GraphData, filter: LanguageFilter | EdgeFilter) => {
    const param = filterStates.get(filter.id) ?? filter.defaultParam;
    const result = transformData(current, (data) => filter.lambda(data, param as any)) ?? current;
    return result;
  };

  const applyStageList = (
    current: GraphData,
    filters: Array<LanguageFilter | EdgeFilter>
  ): GraphData => {
    return filters.reduce<GraphData>((working, filter) => transformStage(working, filter), current);
  };

  const afterLanguageFilters = applyStageList(dataset, languageFilters);
  const afterEdgeFilters = applyStageList(afterLanguageFilters, edgeFilters);

  const visibleLanguageIds = new Set(afterEdgeFilters.languages.map((language) => language.id));
  const visibleEdgeIds = collectVisibleEdgeIds(afterEdgeFilters.adjacencyMatrix);

  return {
    ...afterEdgeFilters,
    visibleLanguageIds,
    visibleEdgeIds
  };
}

/**
 * Filters the adjacency matrix:
 * 1. Remove edges connected to hidden nodes
 * 2. Apply edge filters to remaining edges
 */
function collectVisibleEdgeIds(matrix: KCAdjacencyMatrix): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < matrix.languageIds.length; i += 1) {
    for (let j = 0; j < matrix.languageIds.length; j += 1) {
      if (matrix.matrix[i][j]) {
        ids.add(`${matrix.languageIds[i]}->${matrix.languageIds[j]}`);
      }
    }
  }
  return ids;
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
