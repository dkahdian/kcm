import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const obdd: KCLanguage = {
  id: 'obdd',
  name: 'OBDD',
  fullName: 'Ordered Binary Decision Diagram',
  description: 'BDD with a fixed variable ordering',
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
  references: getReferences('darwiche-2002'),
  position: { x: 725, y: 260 },
  children: [
    { id: 'obdd-obdd-lt', target: 'obdd-lt', typeId: 'succinctness', label: '≤', description: 'OBDD is at least as succinct as OBDD<', refs: ['darwiche-2002'] }
  ]
};
