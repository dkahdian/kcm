import type { KCLanguage } from '../../types.js';

export const nnf: KCLanguage = {
  id: 'nnf',
  name: 'NNF',
  fullName: 'Negation Normal Form',
  description: 'Boolean formulas where negation appears only at the literal level',
  descriptionRefs: ['darwiche-2002'], // References the Darwiche & Marquis paper
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'EQ', label: 'Equivalence', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CT', label: 'Model Counting', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'false', refs: ['darwiche-2002'] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'FO', label: 'Forgetting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: '∧C', label: 'Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    ]
  },
  tags: [
    { id: 'normal-form', label: 'Normal Form', color: '#6366f1', refs: ['darwiche-2002'] },
    { id: 'general', label: 'General', color: '#10b981', refs: ['darwiche-2002'] }
  ],
  references: [
    { id: 'darwiche-2002', title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 200, y: 100 },
  children: [
    { id: 'nnf-dnnf', target: 'dnnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNNF', refs: ['darwiche-2002'] },
    { id: 'nnf-dnf', target: 'dnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNF', refs: ['darwiche-2002'] },
    { id: 'nnf-cnf', target: 'cnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as CNF', refs: ['darwiche-2002'] }
  ]
};
