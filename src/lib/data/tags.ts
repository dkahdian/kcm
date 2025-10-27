import type { KCTag } from '../types.js';

/**
 * Base tag definition without refs (used for canonical definitions)
 */
export type BaseTag = Omit<KCTag, 'refs'> & { refs?: string[] };

/**
 * Canonical tag definitions for knowledge compilation languages.
 * Tags represent structural or semantic properties that languages may possess.
 */
export const CANONICAL_TAGS: Record<string, BaseTag> = {
  decomposability: {
    id: 'decomposability',
    label: 'Decomposability',
    color: '#84cc16', // lime-500
    description: 'Conjunctions have disjoint variable scopes'
  },
  determinism: {
    id: 'determinism',
    label: 'Determinism',
    color: '#ef4444', // red-500
    description: 'Disjunctions are mutually exclusive'
  },
  smoothness: {
    id: 'smoothness',
    label: 'Smoothness',
    color: '#06b6d4', // cyan-500
    description: 'All disjuncts mention the same variables'
  },
  flatness: {
    id: 'flatness',
    label: 'Flatness',
    color: '#7c3aed', // violet-600
    description: 'Formula has bounded height'
  },
  ordering: {
    id: 'ordering',
    label: 'Ordering',
    color: '#f97316', // orange-500
    description: 'Variables follow a fixed ordering'
  },
  'read-once': {
    id: 'read-once',
    label: 'Read-Once',
    color: '#ec4899', // pink-500
    description: 'Each variable appears at most once on any path'
  },
  decision: {
    id: 'decision',
    label: 'Decision',
    color: '#8b5cf6', // violet-500
    description: 'Based on decision diagram structure'
  },
  structured: {
    id: 'structured',
    label: 'Structured',
    color: '#10b981', // emerald-500
    description: 'Decomposition follows a structured pattern'
  }
};

/**
 * Get tag by ID. Returns undefined if not found.
 */
export function getTag(id: string): BaseTag | undefined {
  return CANONICAL_TAGS[id];
}

/**
 * Get multiple tags by their IDs.
 * Returns array of found tags with their reference lists.
 */
export function getTags(ids: string[], refs: string[] = []): KCTag[] {
  return ids.map(id => {
    const tag = CANONICAL_TAGS[id];
    if (!tag) {
      console.warn(`Tag '${id}' not found in canonical tags`);
      return { id, label: id, color: '#6366f1', refs }; // fallback
    }
    return { ...tag, refs };
  });
}

/**
 * Get all available tags as an array (without refs).
 */
export function getAllTags(): BaseTag[] {
  return Object.values(CANONICAL_TAGS);
}
