import type { CanonicalKCData } from '../types.js';

/**
 * Placeholder implicit propagation pass – currently a no-op.
 * Future work: fill transitive relationships, recompute derived metadata, etc.
 */
export function propagateImplicitRelations(data: CanonicalKCData): CanonicalKCData {
  return data;
}
