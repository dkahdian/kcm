import type { Complexity } from '../types.js';

/**
 * Valid complexity codes used in the application.
 * Use isValidComplexityCode() to validate strings at runtime.
 */
export const COMPLEXITY_CODES = [
  'poly',
  'no-poly-unknown-quasi',
  'no-poly-quasi',
  'unknown-poly-quasi',
  'unknown-both',
  'no-quasi',
  'not-poly'
] as const;

/**
 * Canonical complexity definitions for transformations and operations.
 * These define how complexity classifications are displayed throughout the app.
 * 
 * IMPORTANT: Always use getComplexity() to get the full Complexity object
 * for display in the frontend. Never display raw code strings to users.
 * 
 * Operation codes are merged into succinctness codes:
 * - poly -> poly (🟢)
 * - quasi -> no-poly-quasi (⚡)
 * - exp -> no-quasi (❌)
 * - unknown/open -> unknown-both (❔/❓)
 * 
 * - code: Internal identifier
 * - label: Human-readable name
 * - notation: Short LaTeX notation for succinctness relations (f:languageA→languageB)
 * - emoji: For query/transformation operations (f:any→any)
 * - description: Full LaTeX-enabled description for tooltips/info panels
 * - color: Saturated hex color for icons/text
 * - pastel: Pastel version of color for backgrounds
 * - cssClass: CSS class name for styling
 */
export const COMPLEXITIES: Record<string, Complexity> = {
  poly: {
    code: 'poly',
    label: 'Polynomial',
    description: 'Polynomial transformation exists',
    notation: '$\\leq_p$',
    emoji: '🟢',
    color: '#22c55e', // green-500
    pastel: '#dcfce7', // green-100
    cssClass: 'complexity-poly'
  },
  'no-poly-unknown-quasi': {
    code: 'no-poly-unknown-quasi',
    label: 'No Poly, Quasi Unknown',
    description: 'No polynomial transformation; quasi-polynomial unknown',
    notation: '$\\not\\leq_p$ · $?\\leq_q$',
    emoji: '⚠️',
    color: '#ef4444', // red-500
    pastel: '#fee2e2', // red-100
    cssClass: 'complexity-no-poly-unknown-quasi'
  },
  'no-poly-quasi': {
    code: 'no-poly-quasi',
    label: 'No Poly, Quasi Exists',
    description: 'No polynomial transformation; quasi-polynomial exists',
    notation: '$\\not\\leq_p$ · $\\leq_q$',
    emoji: '⚡',
    color: '#f97316', // orange-500
    pastel: '#ffedd5', // orange-100
    cssClass: 'complexity-no-poly-quasi'
  },
  'unknown-poly-quasi': {
    code: 'unknown-poly-quasi',
    label: 'Poly Unknown, Quasi Exists',
    description: 'Polynomial unknown; quasi-polynomial exists',
    notation: '$?\\leq_p$ · $\\leq_q$',
    emoji: '⚡',
    color: '#eab308', // yellow-500
    pastel: '#fef9c3', // yellow-100
    cssClass: 'complexity-unknown-poly-quasi'
  },
  'unknown-both': {
    code: 'unknown-both',
    label: 'Unknown',
    description: 'Both polynomial and quasi-polynomial unknown',
    notation: '$?\\leq_p$ · $?\\leq_q$',
    emoji: '❔',
    color: '#6b7280', // gray-500
    pastel: '#f3f4f6', // gray-100
    cssClass: 'complexity-unknown-both'
  },
  'no-quasi': {
    code: 'no-quasi',
    label: 'No Quasi',
    description: 'No quasi-polynomial transformation (implies no polynomial)',
    notation: '$\\not\\leq_q$',
    emoji: '❌',
    color: '#dc2626', // red-600
    pastel: '#fecaca', // red-200
    cssClass: 'complexity-no-quasi'
  },
  'not-poly': {
    code: 'not-poly',
    label: 'Not Polynomial',
    description: 'No polynomial transformation',
    notation: '$\\not\\leq_p$',
    emoji: '❌',
    color: '#ef4444', // red-500
    pastel: '#fee2e2', // red-100
    cssClass: 'complexity-not-poly'
  }
};

/**
 * Get complexity info by code.
 * Falls back to 'unknown-both' if code is not recognized.
 * 
 * IMPORTANT: Use this function to get the full Complexity object for display.
 */
export function getComplexity(code: string): Complexity {
  return COMPLEXITIES[code] || COMPLEXITIES['unknown-both'];
}

/**
 * Get the color for a complexity code.
 */
export function getComplexityColor(code: string): string {
  return getComplexity(code).color;
}

/**
 * Get the CSS class for a complexity code.
 */
export function getComplexityClass(code: string): string {
  return getComplexity(code).cssClass;
}

/**
 * Get the notation (short LaTeX) for a complexity code.
 */
export function getComplexityNotation(code: string): string {
  return getComplexity(code).notation;
}

/**
 * Get the description for a complexity code.
 */
export function getComplexityDescription(code: string): string {
  return getComplexity(code).description;
}

/**
 * Get the label for a complexity code.
 */
export function getComplexityLabel(code: string): string {
  return getComplexity(code).label;
}

/**
 * Get the emoji for a complexity code.
 * Use this for query/transformation operations (f:any→any).
 */
export function getComplexityEmoji(code: string): string {
  return getComplexity(code).emoji;
}

/**
 * Get the pastel color for a complexity code.
 * Use this for backgrounds.
 */
export function getComplexityPastel(code: string): string {
  return getComplexity(code).pastel;
}

/**
 * Check if a code is a valid complexity code.
 */
export function isValidComplexityCode(code: string): boolean {
  return code in COMPLEXITIES;
}

/**
 * Get all complexity codes.
 */
export function getAllComplexityCodes(): string[] {
  return Object.keys(COMPLEXITIES);
}
