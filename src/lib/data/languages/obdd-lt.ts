import type { KCLanguage } from '../../types.js';

export const obddLt: KCLanguage = {
  id: 'obdd-lt',
  name: 'OBDD<',
  fullName: 'Ordered Binary Decision Diagram (using order <)',
  description: 'OBDDs under a specific ordering constraint (<)',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'IM', label: 'Implicant', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'EQ', label: 'Equivalence', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'CT', label: 'Model Counting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'true', refs: ['darwiche-2002'] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'FO', label: 'Forgetting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∧C', label: 'Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨C', label: 'Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '¬C', label: 'Negation', polytime: 'true', refs: ['darwiche-2002'] }
    ]
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['darwiche-2002'] },
    { id: 'ordering', label: 'Ordering', color: '#22c55e', refs: ['darwiche-2002'] }
  ],
  references: [
    { id: 'darwiche-2002', title: 'Knowledge Compilation Map (Darwiche & Marquis, 2002)', href: 'https://arxiv.org/pdf/1106.1819' }
  ],
  position: { x: 875, y: 260 },
  children: [
    { id: 'obdd-lt-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'OBDD< is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
