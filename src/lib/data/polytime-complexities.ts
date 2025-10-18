/**
 * Canonical definitions for polytime complexity flags.
 * This centralizes the mapping from complexity codes to their display properties.
 */

import type { PolytimeFlagCode, PolytimeFlag } from '../types.js';

/**
 * Canonical polytime complexity flags
 */
export const POLYTIME_COMPLEXITIES: Record<PolytimeFlagCode, PolytimeFlag> = {
  poly: {
    code: 'poly',
    label: 'Polynomial',
    color: '#22c55e', // green-500
    emoji: '🟢',
    description: 'Operation is polynomial time'
  },
  quasi: {
    code: 'quasi',
    label: 'Quasi-polynomial',
    color: '#f97316',
    emoji: '⚡',
    description: 'Operation is quasi-polynomial time'
  },
  exp: {
    code: 'exp',
    label: 'Exponential',
    color: '#ef4444',
    emoji: '❌',
    description: 'Operation is exponential time (proven)'
  },
  'not-poly-conditional': {
    code: 'not-poly-conditional',
    label: 'Not Poly (Conditional)',
    color: '#f97316',
    emoji: '⚠️',
    description: 'Not polynomial under complexity assumption (e.g., Unless P=NP)'
  },
  unknown: {
    code: 'unknown',
    label: 'Unknown',
    color: '#9ca3af',
    emoji: '❔',
    description: 'Complexity is unknown'
  },
  open: {
    code: 'open',
    label: 'Open Problem',
    color: '#9ca3af',
    emoji: '❓',
    description: 'Open research problem'
  }
};

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
