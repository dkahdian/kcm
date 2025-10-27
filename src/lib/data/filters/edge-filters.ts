import type { EdgeFilter, DirectedSuccinctnessRelation } from '../../types.js';

/**
 * Show only poly edges (filters out no-poly-unknown-quasi, no-poly-quasi, and no-quasi)
 */
export const showPolyOnly: EdgeFilter = {
  id: 'poly-only',
  name: 'Poly Only',
  description: 'Show only polynomial transformation edges',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    // Filter out edges that don't have poly
    if (relation.status === 'no-poly-unknown-quasi' || 
        relation.status === 'no-poly-quasi' || 
        relation.status === 'no-quasi') {
      return null;
    }
    
    return relation;
  }
};

/**
 * Show only quasi edges (filters out no-quasi)
 */
export const showQuasiOnly: EdgeFilter = {
  id: 'quasi-only',
  name: 'Quasi Only',
  description: 'Show only quasi-polynomial transformation edges',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    // Filter out no-quasi edges
    if (relation.status === 'no-quasi') {
      return null;
    }
    
    return relation;
  }
};

/**
 * Omit unknowns (only keep poly, no-poly-quasi, and no-quasi) - ON BY DEFAULT
 */
export const omitUnknowns: EdgeFilter = {
  id: 'omit-unknowns',
  name: 'Omit Unknowns',
  description: 'Hide edges with unknown transformation status',
  category: 'Edge Visibility',
  defaultParam: true, // ON BY DEFAULT
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    // Keep only poly, no-poly-quasi, and no-quasi
    if (relation.status === 'poly' || 
        relation.status === 'no-poly-quasi' || 
        relation.status === 'no-quasi') {
      return relation;
    }
    
    return null;
  }
};

/**
 * Treat unknowns pessimistically
 * - unknown-both → no-quasi
 * - unknown-poly-quasi → no-poly-quasi
 * - no-poly-unknown-quasi → no-quasi
 */
export const treatUnknownsPessimistically: EdgeFilter = {
  id: 'treat-unknowns-pessimistically',
  name: 'Treat Unknowns Pessimistically',
  description: 'Transform unknown edges to their most restrictive interpretation',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    let newStatus = relation.status;
    
    if (relation.status === 'unknown-both') {
      newStatus = 'no-quasi';
    } else if (relation.status === 'unknown-poly-quasi') {
      newStatus = 'no-poly-quasi';
    } else if (relation.status === 'no-poly-unknown-quasi') {
      newStatus = 'no-quasi';
    }
    
    if (newStatus !== relation.status) {
      return { ...relation, status: newStatus };
    }
    
    return relation;
  }
};

/**
 * Treat unknowns optimistically
 * - no-poly-unknown-quasi → no-poly-quasi
 * - unknown-poly-quasi → poly
 * - unknown-both → poly
 */
export const treatUnknownsOptimistically: EdgeFilter = {
  id: 'treat-unknowns-optimistically',
  name: 'Treat Unknowns Optimistically',
  description: 'Transform unknown edges to their most permissive interpretation',
  category: 'Edge Visibility',
  defaultParam: false,
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    let newStatus = relation.status;
    
    if (relation.status === 'no-poly-unknown-quasi') {
      newStatus = 'no-poly-quasi';
    } else if (relation.status === 'unknown-poly-quasi') {
      newStatus = 'poly';
    } else if (relation.status === 'unknown-both') {
      newStatus = 'poly';
    }
    
    if (newStatus !== relation.status) {
      return { ...relation, status: newStatus };
    }
    
    return relation;
  }
};

/**
 * Omit separator functions - ON BY DEFAULT
 */
export const omitSeparatorFunctions: EdgeFilter = {
  id: 'omit-separator-functions',
  name: 'Omit Separator Functions',
  description: 'Hide all separator functions from edges',
  category: 'Edge Visibility',
  defaultParam: true, // ON BY DEFAULT
  controlType: 'checkbox',
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    // Remove all separator functions
    if (relation.separatingFunctions && relation.separatingFunctions.length > 0) {
      return {
        ...relation,
        separatingFunctions: []
      };
    }
    
    return relation;
  }
};

export const edgeFilters: EdgeFilter[] = [
  showPolyOnly,
  showQuasiOnly,
  omitUnknowns,
  treatUnknownsPessimistically,
  treatUnknownsOptimistically,
  omitSeparatorFunctions
];
