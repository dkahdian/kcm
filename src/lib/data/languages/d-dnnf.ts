import type { KCLanguage } from '../../types.js';

export const dDnnf: KCLanguage = {
  id: 'd-dnnf',
  name: 'd-DNNF',
  fullName: 'Deterministic Decomposable Negation Normal Form',
  description: 'DNNF with determinism',
  descriptionRefs: [0],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: [0] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: [0] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: [0] },
      { code: 'IM', label: 'Implicant', polytime: 'true', refs: [0] },
      { code: 'EQ', label: 'Equivalence', polytime: 'unknown', refs: [0] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: [0] },
      { code: 'CT', label: 'Model Counting', polytime: 'true', refs: [0] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'true', refs: [0] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: [0] },
      { code: 'FO', label: 'Forgetting', polytime: 'true', refs: [0] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: [0] },
      { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: [0] },
      { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP', refs: [0] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: [0] },
      { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP', refs: [0] }
    ]
  },
  tags: [
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: [0] },
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 125, y: 260 },
  children: [
    { id: 'd-dnnf-fbdd', target: 'fbdd', typeId: 'succinctness', label: '≤', description: 'd-DNNF is at least as succinct as FBDD', refs: [0] }
  ]
};
