import type { KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../types.js';

const languageIds = [
  'cnf',
  'd-dnnf',
  'dnnf',
  'dnf',
  'fbdd',
  'nnf',
  'obdd',
  'obdd-lt',
  'pi',
  'sd-dnnf',
  'ip',
  'mods',
  'f-nnf',
  's-nnf'
];

const indexByLanguage: Record<string, number> = {
  'cnf': 0,
  'd-dnnf': 1,
  'dnnf': 2,
  'dnf': 3,
  'fbdd': 4,
  'nnf': 5,
  'obdd': 6,
  'obdd-lt': 7,
  'pi': 8,
  'sd-dnnf': 9,
  'ip': 10,
  'mods': 11,
  'f-nnf': 12,
  's-nnf': 13
};

const matrix: (DirectedSuccinctnessRelation | null)[][] = [
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
            { status: 'poly',
        description: '',
        refs: ['Darwiche_2002'],
        separatingFunctions: []
      },
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
];

export function indexForLanguage(id: string): number | undefined {
  return indexByLanguage[id];
}

export function languageForIndex(index: number): string | undefined {
  return languageIds[index];
}

export const adjacencyMatrixData: KCAdjacencyMatrix = {
  languageIds,
  indexByLanguage,
  matrix
};

// Temporary export for contribution system (to be replaced)
export const edges: any[] = [];
