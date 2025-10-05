import type { KCLanguage } from '../../types.js';

export const obddLt: KCLanguage = {
  id: 'obdd-lt',
  name: 'OBDD<',
  fullName: 'Ordered Binary Decision Diagram (using order <)',
  description: 'OBDDs under a specific ordering constraint (<)',
  descriptionRefs: [0],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: [0] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: [0] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: [0] },
      { code: 'IM', label: 'Implicant', polytime: 'true', refs: [0] },
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
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: [0] },
    { id: 'ordering', label: 'Ordering', color: '#22c55e', refs: [0] }
  ],
  references: [
    { title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 875, y: 260 },
  children: [
    { id: 'obdd-lt-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'OBDD< is at least as succinct as MODS', refs: [0] }
  ]
};
