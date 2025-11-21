import type { CanonicalKCData, TransformValidationResult } from '../types.js';

/**
 * Placeholder validator – always reports success.
 * Replace with structural validation once transformation model matures.
 */
export function validateDatasetStructure(_data: CanonicalKCData): TransformValidationResult {
  return { ok: true };
}
