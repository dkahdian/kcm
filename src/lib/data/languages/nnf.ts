import type { KCLanguage } from '../../types.js';

export const nnf: KCLanguage = {
  id: 'nnf',
  name: 'NNF',
  fullName: 'Negation Normal Form',
  description: 'Boolean formulas where negation appears only at the literal level',
  descriptionRefs: [0], // References the Darwiche & Marquis paper
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: [0] },
      { code: 'VA', label: 'Validity', polytime: 'false', refs: [0] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'false', refs: [0] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: [0] },
      { code: 'EQ', label: 'Equivalence', polytime: 'false', refs: [0] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: [0] },
      { code: 'CT', label: 'Model Counting', polytime: 'false', refs: [0] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'false', refs: [0] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: [0] },
      { code: 'FO', label: 'Forgetting', polytime: 'true', refs: [0] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: '∧C', label: 'Conjunction', polytime: 'true', refs: [0] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: [0] },
      { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: [0] },
      { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP', refs: [0] }
    ]
  },
  tags: [
    { id: 'normal-form', label: 'Normal Form', color: '#6366f1', refs: [0] },
    { id: 'general', label: 'General', color: '#10b981', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 200, y: 100 },
  children: [
    { id: 'nnf-dnnf', target: 'dnnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNNF', refs: [0] },
    { id: 'nnf-dnf', target: 'dnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNF', refs: [0] },
    { id: 'nnf-cnf', target: 'cnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as CNF', refs: [0] }
  ]
};
