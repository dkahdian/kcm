/**
 * Canonical definitions for polytime complexity flags.
 * This centralizes the mapping from complexity codes to their display properties.
 */

import type { PolytimeFlag, PolytimeFlagCode } from '../types.js';

/**
 * Canonical polytime complexity definitions.
 * Maps complexity codes to their full flag objects.
 */
export const POLYTIME_COMPLEXITIES: Record<PolytimeFlagCode, PolytimeFlag> = {
  'true': {
    code: 'true',
    label: 'Polynomial-time',
    emoji: '🟢',
    color: '#22c55e', // green-500
    description: 'This operation can be performed in polynomial time'
  },
  'false': {
    code: 'false',
    label: 'Not polynomial-time',
    emoji: '🔴',
    color: '#ef4444', // red-500
    description: 'This operation requires exponential time (unless P=NP)'
  },
  'unknown': {
    code: 'unknown',
    label: 'Unknown to us',
    emoji: '🟡',
    color: '#eab308', // yellow-500
    description: 'Complexity unknown us'
  },
  'open': {
    code: 'open',
    label: 'Open problem',
    emoji: '🟠',
    color: '#f97316', // orange-500
    description: 'This is an open research question'
  }
} as const;

/**
 * Get polytime flag by code.
 * Returns the 'open' flag if code is not recognized.
 */
export function getPolytimeFlag(code: string): PolytimeFlag {
  return POLYTIME_COMPLEXITIES[code as PolytimeFlagCode] || POLYTIME_COMPLEXITIES['open'];
}

/**
 * Get just the emoji for a complexity code.
 * Convenience function for quick access.
 */
export function getComplexityEmoji(code: string): string {
  return getPolytimeFlag(code).emoji;
}

/**
 * Get just the color for a complexity code.
 * Convenience function for quick access.
 */
export function getComplexityColor(code: string): string {
  return getPolytimeFlag(code).color;
}
