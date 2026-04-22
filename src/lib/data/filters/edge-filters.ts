import type { DirectedSuccinctnessRelation, EdgeFilter, GraphData } from '../../types.js';
import { mapRelationsInDataset, mapLanguagesInDataset } from '../transforms.js';

type ManageUnknownsMode = 'omit-all' | 'expressively' | 'optimistically' | 'pessimistically';
type PolyDisplayMode = 'include-quasipolynomial' | 'polytime-vs-not';

/**
 * A classifier function that determines if an edge matches a certain criterion.
 * Returns true if the edge matches (should be considered for hiding), false otherwise.
 * A null relation is treated as matching (i.e., absence of an edge counts as matching the criterion).
 */
type EdgeClassifier = (relation: DirectedSuccinctnessRelation | null) => boolean;

/**
 * Creates an edge filter that hides edge pairs where BOTH directions match the classifier.
 * For an edge A<->B, we hide the edge IFF:
 * - A->B matches the classifier (or is null)
 * - B->A matches the classifier (or is null)
 * 
 * This ensures we only hide edges where both directions satisfy the condition.
 */
function createPairwiseOmitFilter(
  classifier: EdgeClassifier,
  data: GraphData
): (relation: DirectedSuccinctnessRelation | null, sourceId: string, targetId: string) => DirectedSuccinctnessRelation | null {
  const { indexByLanguage, matrix } = data.adjacencyMatrix;
  
  return (relation, sourceId, targetId) => {
    if (!relation) return null;
    
    // Check if this direction matches the classifier
    const forwardMatches = classifier(relation);
    
    // Get the reverse direction
    const sourceIdx = indexByLanguage[sourceId];
    const targetIdx = indexByLanguage[targetId];
    if (sourceIdx === undefined || targetIdx === undefined) return relation;
    
    const reverse = matrix[targetIdx]?.[sourceIdx] ?? null;
    const reverseMatches = classifier(reverse);
    
    // Only hide if BOTH directions match (or are null)
    if (forwardMatches && reverseMatches) {
      return null;
    }
    
    return relation;
  };
}

/**
 * Control how polynomial and quasipolynomial edges are displayed
 */
export const polyDisplay: EdgeFilter<PolyDisplayMode> = {
  id: 'poly-display',
  name: 'Polynomial Display',
  description: 'Control how polynomial and quasipolynomial complexity edges are shown',
  applicableViews: ['graph', 'succinctness'],
  uiGroup: 'Display',
  kind: 'matrix-display',
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
    let mapped = mapRelationsInDataset(data, (relation) => {
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

    // Keep operations views consistent with the succinctness collapse by mapping
    // quasi-level operation outcomes into a binary poly vs not-poly representation.
    mapped = mapLanguagesInDataset(mapped, (language) => {
      const collapseOpMap = (ops: Record<string, import('$lib/types.js').KCOpSupport> | undefined) => {
        const result: Record<string, import('$lib/types.js').KCOpSupport> = {};
        for (const [opCode, support] of Object.entries(ops ?? {})) {
          let newComplexity = support.complexity;
          switch (support.complexity) {
            case 'poly':
              break;
            case 'no-poly-unknown-quasi':
            case 'no-poly-quasi':
            case 'no-quasi':
              newComplexity = 'not-poly';
              break;
            case 'unknown-poly-quasi':
            case 'unknown-both':
              newComplexity = 'unknown';
              break;
          }
          result[opCode] =
            newComplexity === support.complexity
              ? support
              : { ...support, complexity: newComplexity };
        }
        return result;
      };

      return {
        ...language,
        properties: {
          ...language.properties,
          queries: collapseOpMap(language.properties.queries),
          transformations: collapseOpMap(language.properties.transformations)
        }
      };
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
 * Omit separator functions - always off, not user-facing
 */
export const omitSeparatorFunctions: EdgeFilter = {
  id: 'omit-separator-functions',
  name: 'Omit Separator Functions',
  description: 'Hide all separator functions from edges',
  applicableViews: ['graph', 'succinctness'],
  uiGroup: 'Advanced',
  kind: 'internal',
  // Locked on now that the UI toggle is gone.
  defaultParam: true,
  controlType: 'checkbox',
  hidden: true,
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
 * Manage how unknown edges are displayed or transformed
 */
export const manageUnknowns: EdgeFilter<ManageUnknownsMode> = {
  id: 'manage-unknowns',
  name: 'Manage Unknowns',
  description: 'Control how edges with unknown status are treated',
  applicableViews: ['graph', 'succinctness'],
  uiGroup: 'Visibility',
  kind: 'edge-visibility',
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
 * Omit incomparable - ON BY DEFAULT
 *
 * Hides pairs where both directions are no-quasi (or null).
 * Uses the pairwise classifier: an edge pair A<->B is hidden IFF
 * both A->B and B->A are no-quasi or null.
 */
export const omitIncomparable: EdgeFilter<boolean> = {
  id: 'omit-incomparable',
  name: 'Omit Incomparable',
  description: 'Omit edges where both directions are no-quasi',
  applicableViews: ['graph'],
  uiGroup: 'Visibility',
  kind: 'edge-visibility',
  defaultParam: true,
  defaultParamMatrix: false,
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;
    
    // Classifier: matches if the relation is no-quasi (or null)
    const isIncomparable: EdgeClassifier = (rel) => !rel || rel.status === 'no-quasi';
    
    return mapRelationsInDataset(data, createPairwiseOmitFilter(isIncomparable, data));
  }
};

/**
 * Omit edges marked as hidden (used by transitive reduction)
 * This is an internal filter that should always be applied
 */
export const omitMarkedEdges: EdgeFilter = {
  id: 'omit-marked-edges',
  name: 'Omit Marked Edges',
  description: 'Omit edges that have been marked as hidden',
  applicableViews: ['graph', 'succinctness', 'queries', 'transforms'],
  uiGroup: 'Advanced',
  kind: 'internal',
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
 * Omit implicit (derived) edges - ON BY DEFAULT for graph view
 * 
 * Hides edge pairs where both directions were inferred by propagation (derived=true)
 * or are null. Uses the pairwise classifier: an edge pair A<->B is hidden IFF
 * both A->B and B->A are derived or null.
 */
export const omitImplicitEdges: EdgeFilter = {
  id: 'omit-implicit-edges',
  name: 'Omit Implicit Edges',
  description: 'Omit edges where both directions were inferred by propagation',
  applicableViews: ['graph'],
  uiGroup: 'Visibility',
  kind: 'edge-visibility',
  defaultParam: true, // ON by default for graph
  defaultParamMatrix: false, // OFF by default for matrix
  controlType: 'checkbox',
  lambda: (data, param) => {
    if (!param) return data;
    
    // Classifier: matches if the relation is derived (or null)
    const isImplicit: EdgeClassifier = (rel) => !rel || rel.derived === true;
    
    return mapRelationsInDataset(data, createPairwiseOmitFilter(isImplicit, data));
  }
};

type ImplicitEdgeTreatmentMode = 'gray';

/**
 * Implicit edge treatment.
 *
 * This is now an internal always-on gray styling pass rather than a user-facing
 * filter. It keeps derived edges visually distinct without exposing a control.
 */
export const implicitEdgeTreatment: EdgeFilter<ImplicitEdgeTreatmentMode> = {
  id: 'implicit-edge-treatment',
  name: 'Implicit Edge Treatment',
  description: 'Apply gray styling to implicit (derived) edges',
  applicableViews: ['graph', 'succinctness', 'queries', 'transforms'],
  uiGroup: 'Advanced',
  kind: 'internal',
  defaultParam: 'gray',
  defaultParamMatrix: 'gray',
  hidden: true,
  lambda: (data, mode) => {
    // Apply to succinctness edges
    let result = mapRelationsInDataset(data, (relation) => {
      if (!relation) return null;

      if (relation.derived) {
        return { ...relation, dimmed: true };
      }
      return relation;
    });

    // Apply to operations data (queries + transformations)
    result = mapLanguagesInDataset(result, (language) => {
      const mapOps = (ops: Record<string, import('$lib/types.js').KCOpSupport>) => {
        const mapped: Record<string, import('$lib/types.js').KCOpSupport> = {};
        for (const [code, support] of Object.entries(ops)) {
          if (support.derived) {
            mapped[code] = { ...support, dimmed: true };
          } else {
            mapped[code] = support;
          }
        }
        return mapped;
      };
      return {
        ...language,
        properties: {
          ...language.properties,
          queries: mapOps(language.properties.queries ?? {}),
          transformations: mapOps(language.properties.transformations ?? {})
        }
      };
    });

    return result;
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
  applicableViews: ['graph'],
  uiGroup: 'Visibility',
  kind: 'edge-visibility',
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
  omitIncomparable,
  omitImplicitEdges,
  implicitEdgeTreatment,
  polyDisplay,
  omitSeparatorFunctions,
  omitMarkedEdges
];
