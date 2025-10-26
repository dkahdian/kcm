import type { EdgeFilter, DirectedSuccinctnessRelation } from '../../types.js';

/**
 * Hide edges where polynomial transformation is unknown in both directions
 */
export const hideUnknownPolyEdges: EdgeFilter = {
  id: 'hide-unknown-poly',
  name: 'Hide Unknown Poly Edges',
  description: 'Hide edges where polynomial transformation status is unknown in both directions',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation; // Filter not active
    
    // Hide if status indicates unknown polynomial relationship
    if (relation.status === 'unknown-both' || relation.status === 'unknown-poly-quasi') {
      return null;
    }
    
    return relation;
  }
};

/**
 * Hide edges with no polynomial transformation
 */
export const hideNoPolyEdges: EdgeFilter = {
  id: 'hide-no-poly',
  name: 'Hide No-Poly Edges',
  description: 'Hide edges where polynomial transformation does not exist',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation; // Filter not active
    
    // Hide if status indicates no polynomial transformation
    if (relation.status === 'no-poly-unknown-quasi' || relation.status === 'no-poly-quasi') {
      return null;
    }
    
    return relation;
  }
};

/**
 * Show only polynomial transformation edges
 */
export const showOnlyPolyEdges: EdgeFilter = {
  id: 'show-only-poly',
  name: 'Show Only Poly Edges',
  description: 'Show only edges with confirmed polynomial transformations',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation; // Filter not active
    
    // Show only if polynomial transformation exists
    if (relation.status === 'poly') {
      return relation;
    }
    
    return null;
  }
};

/**
 * Hide no-quasi edges (strictly incomparable languages)
 */
export const hideNoQuasiEdges: EdgeFilter = {
  id: 'hide-no-quasi',
  name: 'Hide No-Quasi Edges',
  description: 'Hide edges where no quasi-polynomial transformation exists (strictly incomparable)',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation; // Filter not active
    
    // Hide if no quasi-polynomial transformation
    if (relation.status === 'no-quasi') {
      return null;
    }
    
    return relation;
  }
};

export const edgeFilters: EdgeFilter[] = [
  hideUnknownPolyEdges,
  hideNoPolyEdges,
  showOnlyPolyEdges,
  hideNoQuasiEdges
];
