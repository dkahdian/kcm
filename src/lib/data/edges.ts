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
  cnf: 0,
  'd-dnnf': 1,
  dnnf: 2,
  dnf: 3,
  fbdd: 4,
  nnf: 5,
  obdd: 6,
  'obdd-lt': 7,
  pi: 8,
  'sd-dnnf': 9,
  ip: 10,
  mods: 11,
  'f-nnf': 12,
  's-nnf': 13
};

const matrix: (DirectedSuccinctnessRelation | null)[][] = [
    [
      null,
      null,
      { status: 'poly', description: 'CNF to DNNF in polynomial time (placeholder).', refs: ['Darwiche_2002'], separatingFunctions: [] },
      {
        status: 'no-poly-unknown-quasi',
        description: 'CNF to DNF lacks polynomial algorithm; quasi status open.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Clique',
            name: 'Clique Detection Instances',
            description: 'Clique encodings separate CNF from succinct DNF representations without super-polynomial blowups.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      null,
      { status: 'poly', description: 'CNF to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'd-DNNF to DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      { status: 'unknown-poly-quasi', description: 'd-DNNF to DNF quasi-polynomial; polynomial open.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null,
      { status: 'no-poly-quasi', description: 'd-DNNF to PI only quasi-polynomial.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null,
      null
    ],
    [
      {
        status: 'no-quasi',
        description: 'DNNF to CNF lacks quasi-polynomial compilation.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Parity',
            name: 'Parity Constraints',
            description: 'Families of parity formulas force exponential CNF representations compared with DNNF.',
            refs: ['Darwiche_2002']
          },
          {
            shortName: 'Tseitin',
            name: 'Tseitin Grid Formulas',
            description: 'Tseitin contradictions remain succinct in DNNF but require super-polynomial CNF lower bounds.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      { status: 'poly', description: 'DNNF to d-DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      { status: 'unknown-both', description: 'DNNF to DNF complexity unknown.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      { status: 'no-poly-unknown-quasi', description: 'DNNF to FBDD lacks polynomial algorithm; quasi status open.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      { status: 'poly', description: 'DNNF to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      { status: 'unknown-both', description: 'DNNF to structured DNNF complexity unknown.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null
    ],
    [
      {
        status: 'no-poly-unknown-quasi',
        description: 'DNF to CNF lacks polynomial algorithm; quasi status open.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Parity',
            name: 'Parity Formulas',
            description: 'Parity families require exponentially many CNF clauses when starting from compact DNF witnesses.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      {
        status: 'no-quasi',
        description: 'DNF to d-DNNF believed exponential.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'HWB',
            name: 'Hidden Weighted Bit',
            description: 'Hidden weighted bit functions resist structured DNNF compilation of DNF inputs.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      { status: 'unknown-both', description: 'DNF to DNNF complexity unknown.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      { status: 'poly', description: 'DNF to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null,
      {
        status: 'no-quasi',
        description: 'DNF to IP believed exponential.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Knapsack',
            name: 'Knapsack Constraints',
            description: 'Knapsack-style pseudo-Boolean constraints separate DNF from succinct integer programming encodings.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      null,
      null,
      null
    ],
    [
      null,
      null,
      { status: 'poly', description: 'FBDD to DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      { status: 'poly', description: 'FBDD to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      { status: 'poly', description: 'FBDD to OBDD in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    [
      {
        status: 'no-poly-quasi',
        description: 'NNF to CNF only quasi-polynomial.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Tseitin',
            name: 'Tseitin-style Encodings',
            description: 'Tseitin grids force super-polynomial CNF blowup from compact NNF representations.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      null,
      {
        status: 'no-quasi',
        description: 'NNF to DNNF lacks quasi-polynomial compilation.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'XOR Tree',
            name: 'XOR Tree Formulas',
            description: 'XOR tree structures require decomposition not achievable with quasi-polynomial blowup.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      { status: 'unknown-poly-quasi', description: 'NNF to DNF quasi-polynomial; polynomial open.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      {
        status: 'no-poly-quasi',
        description: 'NNF to FBDD requires quasi-polynomial resources.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'AND-tree',
            name: 'AND-tree Structures',
            description: 'AND-tree formulas resist FBDD representation with quasi-polynomial overhead.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      null,
      null,
      null,
      null,
      null,
      {
        status: 'no-poly-unknown-quasi',
        description: 'NNF to IP lacks polynomial algorithm; quasi status open.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'ILP Hard',
            name: 'Hard ILP Instances',
            description: 'Integer programming problems with exponential NNF-to-IP overhead witness superpolynomial separation.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      { status: 'unknown-poly-quasi', description: 'NNF to MODS quasi-polynomial; polynomial open.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      {
        status: 'no-poly-quasi',
        description: 'NNF to flat NNF requires quasi-polynomial resources.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Depth',
            name: 'High-Depth Circuits',
            description: 'High-depth formulas force quasipolynomial overhead when flattening NNF to flat NNF.',
            refs: ['Darwiche_2002']
          }
        ]
      },
      {
        status: 'no-poly-quasi',
        description: 'NNF to smooth NNF requires quasi-polynomial resources.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Imbalanced NNF',
            name: 'Imbalanced NNF Formulas',
            description: 'Imbalanced formulas require quasi-polynomial smoothing overhead.',
            refs: ['Darwiche_2002']
          }
        ]
      }
    ],
    [
      null,
      null,
      null,
      null,
      { status: 'poly', description: 'OBDD to FBDD in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      { status: 'poly', description: 'OBDD to OBDD<LT in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      {
        status: 'no-poly-unknown-quasi',
        description: 'OBDD to PI lacks polynomial algorithm; quasi status open.',
        refs: ['Darwiche_2002'],
        separatingFunctions: [
          {
            shortName: 'Adder',
            name: 'Binary Adder Circuits',
            description: 'Adder circuits resist polynomial OBDD-to-PI transformation.',
            refs: ['Darwiche_2002']
          }
        ]
      },
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
      { status: 'poly', description: 'OBDD<LT to OBDD in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'PI to d-DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null,
      null,
      { status: 'unknown-poly-quasi', description: 'PI to OBDD quasi-polynomial; polynomial open.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      { status: 'poly', description: 'PI to structured DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      { status: 'unknown-both', description: 'PI to IP complexity unknown.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      null
    ],
    [
      null,
      null,
      { status: 'poly', description: 'Structured DNNF to DNNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'IP to DNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      { status: 'poly', description: 'IP to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
      null,
      null,
      { status: 'unknown-both', description: 'IP to PI complexity unknown.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'MODS to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'Flat NNF to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
      { status: 'poly', description: 'Smooth NNF to NNF in polynomial time.', refs: ['Darwiche_2002'], separatingFunctions: [] },
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
