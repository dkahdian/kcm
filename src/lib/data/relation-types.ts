import type { KCRelationType } from '../types.js';

/**
 * Helper to create bidirectional edge endpoint styles based on transformation status
 */
function getEndpointStyleForStatus(status: string): { arrow: any, dashed?: boolean, isDouble?: boolean } {
  switch (status) {
    case 'poly':
      // 1. Polynomial transformation exists (A ≤_p B)
      // Solid direct arrowhead
      return { arrow: 'triangle', dashed: false };
    
    case 'no-poly-unknown-quasi':
      // 2. No poly, unknown quasi (A ⊄_p B and A ?≤_q B)
      // Dashed straight line, perpendicular to edge
      return { arrow: 'tee', dashed: true };
    
    case 'no-poly-quasi':
      // 3. No poly, has quasi (A ⊄_p B and A ≤_q B)
      // Solid straight line
      return { arrow: 'tee', dashed: false };
    
    case 'unknown-poly-quasi':
      // 4. Unknown poly, has quasi (A ?≤_p B and A ≤_q B)
      // Solid straight line and dashed arrowhead
      // Hollow triangle-cross (triangle is hollow, tee/cross is solid)
      return { arrow: 'triangle-cross', dashed: true };
    
    case 'unknown-both':
      // 5. Both unknown (A ?≤_p B and A ?≤_q B)
      // Hollow square
      return { arrow: 'square', dashed: true };
    
    case 'no-quasi':
      // 6. No quasi-polynomial transformation (A ⊄_q B)
      // Double solid line ||
      // Filled square
      return { arrow: 'square', dashed: false };
    
    default:
      return { arrow: 'none', dashed: false };
  }
}

/**
 * These are no longer used directly - edges are now defined by their forward/backward transformation status.
 * This array is kept for backward compatibility and legend display purposes.
 * 
 * Edge visualization is now determined dynamically based on the transformation status
 * in each direction (forward: source→target, backward: target→source).
 */
export const relationTypes: KCRelationType[] = [
  {
    id: 'poly',
    name: 'Polynomial Transformation',
    label: '≤_p',
    description: 'Polynomial-time transformation exists (A ≤_p B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'triangle', dashed: false },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  },
  {
    id: 'no-poly-unknown-quasi',
    name: 'No Poly, Unknown Quasi',
    label: '⊄_p, ?≤_q',
    description: 'No polynomial transformation, quasi-polynomial unknown (A ⊄_p B and A ?≤_q B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'tee', dashed: true },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  },
  {
    id: 'no-poly-quasi',
    name: 'No Poly, Has Quasi',
    label: '⊄_p, ≤_q',
    description: 'No polynomial but quasi-polynomial exists (A ⊄_p B and A ≤_q B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'tee', dashed: false },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  },
  {
    id: 'unknown-poly-quasi',
    name: 'Unknown Poly, Has Quasi',
    label: '?≤_p, ≤_q',
    description: 'Polynomial unknown but quasi-polynomial exists (A ?≤_p B and A ≤_q B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'triangle-cross', dashed: true },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  },
  {
    id: 'unknown-both',
    name: 'Both Unknown',
    label: '?≤_p, ?≤_q',
    description: 'Both polynomial and quasi-polynomial unknown (A ?≤_p B and A ?≤_q B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'square', dashed: true },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  },
  {
    id: 'no-quasi',
    name: 'No Quasi-Polynomial',
    label: '⊄_q',
    description: 'No quasi-polynomial transformation exists (A ⊄_q B)',
    style: {
      lineStyle: 'solid',
      width: 2,
      targetStyle: { arrow: 'square', dashed: false },
      sourceStyle: { arrow: 'none', dashed: false }
    },
    defaultVisible: true
  }
];

/**
 * Get the visual style for an edge endpoint based on transformation status
 */
export function getEdgeEndpointStyle(status: string): { arrow: any, dashed?: boolean, isDouble?: boolean } {
  return getEndpointStyleForStatus(status);
}
