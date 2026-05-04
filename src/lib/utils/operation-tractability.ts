import type { KCOpEntry, KCOpSupport } from '$lib/types.js';

export type OperationTractabilityId = 'tractable' | 'conditional' | 'intractable' | 'unknown';

export type OperationTractabilityDisplay = {
  id: OperationTractabilityId;
  symbol: string;
  label: string;
  description: string;
  cssClass: string;
};

const UNKNOWN_CODES = new Set(['unknown', 'unknown-both', 'unknown-to-us', 'unknown-poly-quasi']);

export const OPERATION_TRACTABILITY_ORDER: OperationTractabilityId[] = [
  'tractable',
  'conditional',
  'intractable',
  'unknown'
];

export const OPERATION_TRACTABILITY_DISPLAYS: Record<OperationTractabilityId, OperationTractabilityDisplay> = {
  tractable: {
    id: 'tractable',
    symbol: '✓',
    label: 'Tractable',
    description: 'Operation is tractable in polynomial time.',
    cssClass: 'operation-tractability-tractable'
  },
  conditional: {
    id: 'conditional',
    symbol: '○',
    label: 'Conditionally not tractable',
    description: 'Operation is not tractable unless the listed condition holds.',
    cssClass: 'operation-tractability-conditional'
  },
  intractable: {
    id: 'intractable',
    symbol: '●',
    label: 'Not tractable',
    description: 'Operation is not tractable.',
    cssClass: 'operation-tractability-intractable'
  },
  unknown: {
    id: 'unknown',
    symbol: '?',
    label: 'Unknown',
    description: 'Tractability is unknown.',
    cssClass: 'operation-tractability-unknown'
  }
};

export function getOperationTractabilityDisplay(
  support: Pick<KCOpEntry | KCOpSupport, 'complexity' | 'caveat'> | null | undefined
): OperationTractabilityDisplay {
  if (!support?.complexity || UNKNOWN_CODES.has(support.complexity)) {
    return OPERATION_TRACTABILITY_DISPLAYS.unknown;
  }

  if (support.complexity === 'poly') {
    return OPERATION_TRACTABILITY_DISPLAYS.tractable;
  }

  if (support.caveat) {
    return OPERATION_TRACTABILITY_DISPLAYS.conditional;
  }

  return OPERATION_TRACTABILITY_DISPLAYS.intractable;
}

export function getOrderedOperationTractabilityDisplays(
  ids: Iterable<OperationTractabilityId>
): OperationTractabilityDisplay[] {
  const idSet = new Set(ids);
  return OPERATION_TRACTABILITY_ORDER
    .filter((id) => idSet.has(id))
    .map((id) => OPERATION_TRACTABILITY_DISPLAYS[id]);
}
