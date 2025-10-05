import type { KCLanguage } from '../../types.js';

export const fNnf: KCLanguage = {
  id: 'f-nnf',
  name: 'f-NNF',
  fullName: 'Flat Negation Normal Form',
  description: 'NNF with flatness: height at most 2',
  descriptionRefs: [0],
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
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 500, y: 180 }
};
