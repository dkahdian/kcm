import type { KCLanguage } from '../../types.js';

export const pi: KCLanguage = {
  id: 'pi',
  name: 'PI',
  fullName: 'Prime Implicates',
  description: 'Representation by the set of prime implicates',
  descriptionRefs: [0],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: [0] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: [0] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: [0] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: [0] },
      { code: 'EQ', label: 'Equivalence', polytime: 'true', refs: [0] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'true', refs: [0] },
      { code: 'CT', label: 'Model Counting', polytime: 'true', refs: [0] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'true', refs: [0] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: [0] },
      { code: 'FO', label: 'Forgetting', polytime: 'true', refs: [0] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: [0] },
      { code: '∧C', label: 'Conjunction', polytime: 'true', refs: [0] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: [0] },
      { code: '∨C', label: 'Disjunction', polytime: 'true', refs: [0] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: [0] },
      { code: '¬C', label: 'Negation', polytime: 'true', refs: [0] }
    ]
  },
  tags: [
    { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6', refs: [0] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 500, y: 300 },
  children: [
    { id: 'pi-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'PI is at least as succinct as MODS', refs: [0] }
  ]
};
