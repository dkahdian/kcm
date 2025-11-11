import type { KCRelationType } from '../types.js';
import database from './database.json';

function getEndpointStyleForStatus(status: string | null): { arrow: any, dashed?: boolean, isDouble?: boolean } {
  if (status === null) {
    return { arrow: 'none', dashed: false };
  }
  
  switch (status) {
    case 'poly':
      return { arrow: 'triangle', dashed: false };
    case 'no-poly-unknown-quasi':
      return { arrow: 'tee', dashed: true };
    case 'no-poly-quasi':
      return { arrow: 'tee', dashed: false };
    case 'not-poly':
      return { arrow: 'square', dashed: false };
    case 'unknown-poly-quasi':
      return { arrow: 'triangle-cross', dashed: true };
    case 'unknown-both':
      return { arrow: 'square', dashed: true };
    case 'no-quasi':
      return { arrow: 'square', dashed: false };
    default:
      return { arrow: 'none', dashed: false };
  }
}

export const relationTypes: KCRelationType[] = database.relationTypes as KCRelationType[];

export function getEdgeEndpointStyle(status: string | null): { arrow: any, dashed?: boolean, isDouble?: boolean } {
  return getEndpointStyleForStatus(status);
}
