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
 * Check if view mode is a matrix-based view (succinctness, queries, or transforms)
 */
function isMatrixView(viewMode: ViewMode): boolean {
  return viewMode === 'succinctness' || viewMode === 'queries' || viewMode === 'transforms';
}

/**
 * Get the default param for a filter based on view mode.
 * Uses defaultParamMatrix if defined and mode is a matrix view, otherwise defaultParam.
 */
export function getFilterDefault(filter: AnyFilter, viewMode: ViewMode = 'graph'): FilterParamValue {
  if (isMatrixView(viewMode) && filter.defaultParamMatrix !== undefined) {
    return filter.defaultParamMatrix;
  }
  return filter.defaultParam;
}

/**
 * Filter deltas: only the user's changes from defaults.
 * These are view-mode-agnostic and persist across view switches.
 */
export type FilterDeltas = Map<string, FilterParamValue>;

/**
 * Compute effective filter state for a given view mode by merging
 * defaults for that view mode with user deltas.
 */
export function computeEffectiveFilterState(
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[],
  viewMode: ViewMode,
  deltas: FilterDeltas
): FilterStateMap {
  const stateMap: FilterStateMap = new Map();
  const allFilters: AnyFilter[] = [...languageFilters, ...edgeFilters];

  for (const filter of allFilters) {
    const defaultVal = getFilterDefault(filter, viewMode);
    // If user has a delta, use it; otherwise use the view-mode default
    const value = deltas.has(filter.id) ? deltas.get(filter.id)! : defaultVal;
    stateMap.set(filter.id, value);
  }

  return stateMap;
}

/**
 * Extract deltas from a full filter state map by comparing against defaults.
 * Used for migrating from old storage format to new deltas format.
 * 
 * NOTE: We compare against ALL view modes' defaults. A value is only
 * considered a delta if it differs from the graph-mode default
 * (the canonical "base" default).
 */
export function extractDeltasFromState(
  filterStates: FilterStateMap,
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[]
): FilterDeltas {
  const deltas: FilterDeltas = new Map();
  const allFilters: AnyFilter[] = [...languageFilters, ...edgeFilters];

  for (const filter of allFilters) {
    const currentValue = filterStates.get(filter.id);
    if (currentValue === undefined) continue;
    
    // Compare against graph-mode default (canonical base default)
    const graphDefault = getFilterDefault(filter, 'graph');
    if (currentValue !== graphDefault) {
      deltas.set(filter.id, currentValue);
    }
  }

  return deltas;
}

/**
 * Update deltas when the user changes a filter value.
 * If the new value matches the graph-mode default, remove the delta.
 * Otherwise, store/update the delta.
 */
export function updateDelta(
  deltas: FilterDeltas,
  filterId: string,
  value: FilterParamValue,
  filter: AnyFilter
): FilterDeltas {
  const newDeltas = new Map(deltas);
  const graphDefault = getFilterDefault(filter, 'graph');
  
  if (value === graphDefault) {
    newDeltas.delete(filterId);
  } else {
    newDeltas.set(filterId, value);
  }
  
  return newDeltas;
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
 * Collect visible edge IDs from the adjacency matrix.
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
 * @deprecated Use computeEffectiveFilterState + FilterDeltas instead.
 * Creates initial filter state map with all filters set to their defaults for a given view mode
 */
export function createDefaultFilterState(
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[] = [],
  viewMode: ViewMode = 'graph'
): FilterStateMap {
  return computeEffectiveFilterState(languageFilters, edgeFilters, viewMode, new Map());
}

/**
 * @deprecated Use computeEffectiveFilterState + FilterDeltas instead.
 * Adjusts filter states when switching view modes.
 */
export function adjustFilterStateForViewMode(
  currentStates: FilterStateMap,
  languageFilters: LanguageFilter[],
  edgeFilters: EdgeFilter[],
  _fromMode: ViewMode,
  toMode: ViewMode
): FilterStateMap {
  const deltas = extractDeltasFromState(currentStates, languageFilters, edgeFilters);
  return computeEffectiveFilterState(languageFilters, edgeFilters, toMode, deltas);
}
