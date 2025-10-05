import type { KCLanguage } from '../../types.js';

export const dnf: KCLanguage = {
  id: 'dnf',
  name: 'DNF',
  fullName: 'Disjunctive Normal Form',
  description: 'Disjunction of conjunctions of literals',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'IM', label: 'Implicant', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'EQ', label: 'Equivalence', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CT', label: 'Model Counting', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'true', refs: ['darwiche-2002'] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨C', label: 'Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    ]
  },
  tags: [
    { id: 'dnf', label: 'DNF', color: '#f59e0b', refs: ['darwiche-2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['darwiche-2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['darwiche-2002'] }
  ],
  references: [
    { id: 'darwiche-2002', title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 100, y: 300 },
  children: [
    { id: 'dnf-ip', target: 'ip', typeId: 'succinctness', label: '≤', description: 'DNF is at least as succinct as IP', refs: ['darwiche-2002'] }
  ]
};
