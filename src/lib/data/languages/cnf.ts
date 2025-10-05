import type { KCLanguage } from '../../types.js';

export const cnf: KCLanguage = {
  id: 'cnf',
  name: 'CNF',
  fullName: 'Conjunctive Normal Form',
  description: 'Conjunction of disjunctions of literals',
  descriptionRefs: [0],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'false', refs: [0] },
      { code: 'VA', label: 'Validity', polytime: 'false', refs: [0] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: [0] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: [0] },
      { code: 'EQ', label: 'Equivalence', polytime: 'false', refs: [0] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: [0] },
      { code: 'CT', label: 'Model Counting', polytime: 'false', refs: [0] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'false', refs: [0] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: [0] },
      { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: [0] },
      { code: '∧C', label: 'Conjunction', polytime: 'true', refs: [0] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: [0] },
      { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: [0] },
      { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP', refs: [0] }
    ]
  },
  tags: [
    { id: 'cnf', label: 'CNF', color: '#ef4444', refs: [0] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: [0] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 300, y: 300 },
  children: [
    { id: 'cnf-pi', target: 'pi', typeId: 'succinctness', label: '≤', description: 'CNF is at least as succinct as PI', refs: [0] }
  ]
};
