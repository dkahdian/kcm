import type { EdgeFilter, DirectedSuccinctnessRelation } from '../../types.js';

type ManageUnknownsMode = 'omit-all' | 'expressively' | 'optimistically' | 'pessimistically';

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
 * Manage how unknown edges are displayed or transformed
 */
export const manageUnknowns: EdgeFilter<ManageUnknownsMode> = {
  id: 'manage-unknowns',
  name: 'Manage Unknowns',
  description: 'Control how edges with unknown status are treated',
  category: 'Edge Visibility',
  defaultParam: 'omit-all',
  controlType: 'dropdown',
  options: [
    { value: 'omit-all', label: 'Omit all', description: 'Hide edges with unknown or partially unknown status' },
    { value: 'expressively', label: 'Expressively', description: 'Show unknown edges without modification' },
    { value: 'optimistically', label: 'Optimistically', description: 'Assume unknown edges behave as positively as possible' },
    { value: 'pessimistically', label: 'Pessimistically', description: 'Assume unknown edges behave as restrictively as possible' }
  ],
  lambda: (relation, sourceId, targetId, mode) => {
    switch (mode) {
      case 'expressively':
        return relation;
      case 'omit-all':
        if (
          relation.status === 'poly' ||
          relation.status === 'no-poly-quasi' ||
          relation.status === 'no-quasi'
        ) {
          return relation;
        }
        return null;
      case 'optimistically': {
        let newStatus = relation.status;
        if (relation.status === 'no-poly-unknown-quasi') {
          newStatus = 'no-poly-quasi';
        } else if (relation.status === 'unknown-poly-quasi' || relation.status === 'unknown-both') {
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

/**
 * Hide edges marked as hidden (used by transitive reduction)
 * This is an internal filter that should always be applied
 */
export const hideMarkedEdges: EdgeFilter = {
  id: 'hide-marked-edges',
  name: 'Hide Marked Edges',
  description: 'Hide edges that have been marked as hidden',
  category: 'Edge Visibility',
  defaultParam: true,
  controlType: 'checkbox',
  hidden: true, // Internal filter, not shown in UI
  lambda: (relation, sourceId, targetId, param) => {
    if (!param) return relation;
    
    // Hide edges that are marked as hidden
    if (relation.hidden) {
      return null;
    }
    
    return relation;
  }
};

export const edgeFilters: EdgeFilter<any>[] = [
  showPolyOnly,
  showQuasiOnly,
  manageUnknowns,
  omitSeparatorFunctions,
  hideMarkedEdges
];
