import type { EdgeFilter, GraphData } from '../../types.js';
import { mapRelationsInDataset, mapLanguagesInDataset } from '../transforms.js';

type ManageUnknownsMode = 'omit-all' | 'expressively' | 'optimistically' | 'pessimistically';
type PolyDisplayMode = 'include-quasipolynomial' | 'polytime-vs-not';

/**
 * Control how polynomial and quasipolynomial edges are displayed
 */
export const polyDisplay: EdgeFilter<PolyDisplayMode> = {
  id: 'poly-display',
  name: 'Polynomial Display',
  description: 'Control how polynomial and quasipolynomial complexity edges are shown',
  category: 'Visibility',
  defaultParam: 'polytime-vs-not',
  controlType: 'dropdown',
  options: [
    { value: 'include-quasipolynomial', label: 'Also include quasipolynomial time', description: 'Show all edge types as-is' },
    { value: 'polytime-vs-not', label: 'Polytime vs not polytime', description: 'Collapse to polynomial, not polynomial, or unknown' }
  ],
  lambda: (data, mode) => {
    if (mode === 'include-quasipolynomial') {
      return data;
    }
    const mapped = mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;
      let newStatus = relation.status;
      switch (relation.status) {
        case 'poly':
          break;
        case 'no-poly-unknown-quasi':
        case 'no-poly-quasi':
        case 'no-quasi':
          newStatus = 'not-poly';
          break;
        case 'unknown-poly-quasi':
        case 'unknown-both':
          newStatus = 'unknown';
          break;
      }
      return newStatus === relation.status ? relation : { ...relation, status: newStatus };
    });

    // Also adjust complexity display definitions to match the collapsed view.
    // In this view, "poly" means "polytime" and should be rendered as \leq.
    const poly = mapped.complexities['poly'];
    if (poly) {
      mapped.complexities = {
        ...mapped.complexities,
        poly: {
          ...poly,
          notation: '$\\leq$'
        }
      };
    }

    return mapped;
  }
};

/**
 * Manage how unknown edges are displayed or transformed
 */
export const manageUnknowns: EdgeFilter<ManageUnknownsMode> = {
  id: 'manage-unknowns',
  name: 'Manage Unknowns',
  description: 'Control how edges with unknown status are treated',
  category: 'Visibility',
  defaultParam: 'omit-all',
  defaultParamMatrix: 'expressively',
  controlType: 'dropdown',
  options: [
    { value: 'omit-all', label: 'Omit all', description: 'Hide edges with unknown or partially unknown status' },
    { value: 'expressively', label: 'Expressively', description: 'Show unknown edges without modification' },
    { value: 'optimistically', label: 'Optimistically', description: 'Assume unknown edges behave as positively as possible' },
    { value: 'pessimistically', label: 'Pessimistically', description: 'Assume unknown edges behave as restrictively as possible' }
  ],
  lambda: (data, mode) => {
    if (mode === 'expressively') {
      return data;
    }

    return mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;

      switch (mode) {
        case 'omit-all':
          if (
            relation.status !== 'unknown-poly-quasi' &&
            relation.status !== 'unknown-both' &&
            relation.status !== 'no-poly-unknown-quasi'
          ) {
            return relation;
          }
          return null;
        case 'optimistically': {
          let newStatus = relation.status;
          if (relation.status === 'no-poly-unknown-quasi') {
            newStatus = 'no-poly-quasi';
          } else if (
            relation.status === 'unknown-poly-quasi' ||
            relation.status === 'unknown-both'
          ) {
            newStatus = 'poly';
          }
          return newStatus === relation.status ? relation : { ...relation, status: newStatus };
        }
        case 'pessimistically': {
          let newStatus = relation.status;
          if (relation.status === 'unknown-both' || relation.status === 'no-poly-unknown-quasi') {
            newStatus = 'no-quasi';
          } else if (relation.status === 'unknown-poly-quasi') {
            newStatus = 'no-poly-quasi';
          }
          return newStatus === relation.status ? relation : { ...relation, status: newStatus };
        }
        default:
          return relation;
      }
    });
  }
};

/**
 * Positive results only - ON BY DEFAULT
 *
 * Hides edges that represent negative/impossible results or fully unknown status.
 */
export const positiveResultsOnly: EdgeFilter<boolean> = {
  id: 'positive-results-only',
  name: 'Positive Results Only',
  description: 'Hide negative/unknown results (keep only edges that assert existence of a transformation)',
  category: 'Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;
    return mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;
      switch (relation.status) {
        case 'no-poly-unknown-quasi':
        case 'no-quasi':
        case 'not-poly':
        case 'unknown-both':
          return null;
        default:
          return relation;
      }
    });
  }
};

/**
 * Hide incomparable - ON BY DEFAULT
 *
 * Hides pairs where both directions are known to be no-quasi.
 */
export const hideIncomparable: EdgeFilter<boolean> = {
  id: 'hide-incomparable',
  name: 'Hide Incomparable',
  description: 'Hide edges where both directions are no-quasi',
  category: 'Visibility',
  defaultParam: true,
  defaultParamMatrix: false,
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;

    const indexByLanguage = data.adjacencyMatrix.indexByLanguage;
    const matrix = data.adjacencyMatrix.matrix;

    return mapRelationsInDataset(data, (relation, sourceId, targetId) => {
      if (!relation) return null;
      if (relation.status !== 'no-quasi') return relation;

      const sourceIdx = indexByLanguage[sourceId];
      const targetIdx = indexByLanguage[targetId];
      if (sourceIdx === undefined || targetIdx === undefined) return relation;

      const reverse = matrix[targetIdx]?.[sourceIdx];
      if (reverse?.status === 'no-quasi') {
        return null;
      }
      return relation;
    });
  }
};

/**
 * Omit separator functions - ON BY DEFAULT
 */
export const omitSeparatorFunctions: EdgeFilter = {
  id: 'omit-separator-functions',
  name: 'Omit Separator Functions',
  description: 'Hide all separator functions from edges',
  category: 'Visibility',
  defaultParam: true, // ON BY DEFAULT
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;
    return mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;
      if (relation.separatingFunctionIds && relation.separatingFunctionIds.length > 0) {
        return {
          ...relation,
          separatingFunctionIds: []
        };
      }
      return relation;
    });
  }
};

/**
 * Hide edges marked as hidden (used by transitive reduction)
 * This is an internal filter that should always be applied
 */
export const hideMarkedEdges: EdgeFilter = {
  id: 'hide-marked-edges',
  name: 'Hide Marked Edges',
  description: 'Hide edges that have been marked as hidden',
  category: 'Visibility',
  defaultParam: true,
  controlType: 'checkbox',
  hidden: true, // Internal filter, not shown in UI
  lambda: (data, param) => {
    if (!param) return data;
    return mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;
      if (relation.hidden) {
        return null;
      }
      return relation;
    });
  }
};

/**
 * Helper function to determine if a language has any edges
 */
function languageHasEdges(data: GraphData, languageId: string): boolean {
  const { adjacencyMatrix } = data;
  const index = adjacencyMatrix.indexByLanguage[languageId];
  if (index === undefined) return false;
  
  // Check outgoing edges
  const row = adjacencyMatrix.matrix[index];
  if (row) {
    for (let j = 0; j < adjacencyMatrix.languageIds.length; j++) {
      if (row[j]) return true;
    }
  }
  
  // Check incoming edges
  for (let i = 0; i < adjacencyMatrix.languageIds.length; i++) {
    if (adjacencyMatrix.matrix[i]?.[index]) return true;
  }
  
  return false;
}

/**
 * Hide languages that have no edges (in progress languages) - ON BY DEFAULT
 */
export const hideInProgressLanguages: EdgeFilter = {
  id: 'hide-in-progress',
  name: 'Hide In Progress Languages',
  description: 'Hide languages that have no edges (not yet connected to the graph)',
  category: 'Visibility',
  defaultParam: true, // ON BY DEFAULT
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;
    return mapLanguagesInDataset(data, (language) => {
      if (languageHasEdges(data, language.id)) {
        return language;
      }
      return null;
    });
  }
};

export const edgeFilters: EdgeFilter<any>[] = [
  hideInProgressLanguages,
  manageUnknowns,
  hideIncomparable,
  positiveResultsOnly,
  polyDisplay,
  omitSeparatorFunctions,
  hideMarkedEdges
];
