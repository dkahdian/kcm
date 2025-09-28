import type { GraphData } from './types.js';

export const initialGraphData: GraphData = {
  relationTypes: [
    {
      id: 'succinctness',
      name: 'Succinctness',
      label: '≤',
      description: 'A is at least as succinct as B',
      style: { lineColor: '#1e40af', lineStyle: 'solid', width: 2, targetArrow: 'triangle' }
    },
    {
      id: 'equivalence',
      name: 'Equivalence',
      label: '≡',
      description: 'A is equivalent to B',
      style: { lineColor: '#059669', lineStyle: 'solid', width: 2, targetArrow: 'triangle-backcurve' }
    },
    {
      id: 'incomparable',
      name: 'Incomparable',
      label: '∥',
      description: 'A and B are incomparable in succinctness',
      style: { lineColor: '#dc2626', lineStyle: 'dashed', width: 2, targetArrow: 'none' }
    }
  ],
  languages: [
    {
      id: 'nnf',
      name: 'NNF',
      fullName: 'Negation Normal Form',
      description: 'Boolean formulas where negation appears only at the literal level',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' }
        ],
        transformations: [
          { code: 'SU', label: 'Conditioning', polytime: 'true' },
          { code: 'CD', label: 'Conjunction', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false' }
        ]
      },
      tags: [
        { id: 'normal-form', label: 'Normal Form', color: '#6366f1' },
        { id: 'general', label: 'General', color: '#10b981' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 200, y: 100 }
    },
    {
      id: 'dnf',
      name: 'DNF',
      fullName: 'Disjunctive Normal Form',
      description: 'Disjunction of conjunctions of literals',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' }
        ],
        transformations: [
          { code: 'SU', label: 'Conditioning', polytime: 'true' },
          { code: 'CD', label: 'Conjunction', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'dnf', label: 'DNF', color: '#f59e0b' },
        { id: 'flat', label: 'Flat', color: '#64748b' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 100, y: 300 }
    },
    {
      id: 'cnf',
      name: 'CNF',
      fullName: 'Conjunctive Normal Form',
      description: 'Conjunction of disjunctions of literals',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false', note: 'Unless P=NP' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' }
        ],
        transformations: [
          { code: 'SU', label: 'Conditioning', polytime: 'false' },
          { code: 'CD', label: 'Conjunction', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false' }
        ]
      },
      tags: [
        { id: 'cnf', label: 'CNF', color: '#ef4444' },
        { id: 'flat', label: 'Flat', color: '#64748b' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 300, y: 300 }
    }
  ],
  relations: [
    {
      id: 'nnf-dnf',
      source: 'nnf',
      target: 'dnf',
      typeId: 'succinctness',
      label: '≤',
      description: 'NNF is at least as succinct as DNF'
    },
    {
      id: 'nnf-cnf', 
      source: 'nnf',
      target: 'cnf',
      typeId: 'succinctness',
      label: '≤',
      description: 'NNF is at least as succinct as CNF'
    },
    {
      id: 'dnf-cnf',
      source: 'dnf',
      target: 'cnf', 
      typeId: 'incomparable',
      label: '∥',
      description: 'DNF and CNF are incomparable in succinctness'
    }
  ]
};