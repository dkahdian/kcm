import type { 
  GraphData, 
  LanguageFilter, 
  EdgeFilter,
  FilteredGraphData, 
  FilterStateMap, 
  FilterParamValue,
  KCAdjacencyMatrix,
  ViewMode
} from './types.js';
import { transformData } from './data/transforms.js';

type AnyFilter = LanguageFilter | EdgeFilter;

/**
 * Get the default param for a filter based on view mode.
 * Uses defaultParamMatrix if defined and mode is 'matrix', otherwise defaultParam.
 */
export function getFilterDefault(filter: AnyFilter, viewMode: ViewMode = 'graph'): FilterParamValue {
  if (viewMode === 'matrix' && filter.defaultParamMatrix !== undefined) {
    return filter.defaultParamMatrix;
  }
  return filter.defaultParam;
}

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
 * Creates initial filter state map with all filters set to their defaults for a given view mode
 */
export function createDefaultFilterState(
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[] = [],
  viewMode: ViewMode = 'graph'
): FilterStateMap {
  const stateMap: FilterStateMap = new Map();
  for (const filter of languageFilters) {
    stateMap.set(filter.id, getFilterDefault(filter, viewMode));
  }
  for (const filter of edgeFilters) {
    stateMap.set(filter.id, getFilterDefault(filter, viewMode));
  }
  return stateMap;
}

/**
 * Adjusts filter states when switching view modes.
 * For each filter: if the current value equals the old mode's default, switch to the new mode's default.
 * Otherwise, keep the user's custom value.
 */
export function adjustFilterStateForViewMode(
  currentStates: FilterStateMap,
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[],
  fromMode: ViewMode,
  toMode: ViewMode
): FilterStateMap {
  if (fromMode === toMode) return currentStates;

  const allFilters: AnyFilter[] = [...languageFilters, ...edgeFilters];
  const newStates: FilterStateMap = new Map(currentStates);

  for (const filter of allFilters) {
    const currentValue = currentStates.get(filter.id);
    const oldDefault = getFilterDefault(filter, fromMode);
    const newDefault = getFilterDefault(filter, toMode);

    // Only swap to new default if user was at the old default
    if (currentValue === oldDefault) {
      newStates.set(filter.id, newDefault);
    }
    // Otherwise keep the user's custom value
  }

  return newStates;
}
