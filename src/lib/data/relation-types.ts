import type { KCRelationType } from '../types.js';

export const relationTypes: KCRelationType[] = [
  {
    id: 'succinctness',
    name: 'Succinctness',
    label: '≤',
    description: 'A is at least as succinct as B',
    style: { lineColor: '#1e40af', lineStyle: 'solid', width: 2, targetArrow: 'triangle' },
    defaultVisible: true // Show by default
  },
  {
    id: 'equivalence',
    name: 'Equivalence',
    label: '≡',
    description: 'A is equivalent to B',
    style: { lineColor: '#059669', lineStyle: 'solid', width: 2, targetArrow: 'triangle-backcurve' },
    defaultVisible: true // Show by default
  },
  {
    id: 'incomparable',
    name: 'Incomparable',
    label: '∥',
    description: 'A and B are incomparable in succinctness',
    style: { lineColor: '#dc2626', lineStyle: 'dashed', width: 2, targetArrow: 'none' },
    defaultVisible: false // Hidden by default
  }
];
