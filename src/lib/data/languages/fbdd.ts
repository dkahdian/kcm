import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fbdd: KCLanguage = {
  id: 'fbdd',
  name: 'FBDD',
  fullName: 'Free Binary Decision Diagram',
  description: 'BDD without a fixed variable ordering (free order)',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'EQ', label: 'Equivalence', polytime: 'unknown', refs: ['darwiche-2002'] },
      { code: 'SE', label: 'Sentential Entailment', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'CT', label: 'Model Counting', polytime: 'false', refs: ['darwiche-2002'] },
      { code: 'ME', label: 'Model Enumeration', polytime: 'false', refs: ['darwiche-2002'] }
    ],
    transformations: [
      { code: 'CD', label: 'Conditioning', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true', refs: ['darwiche-2002'] },
      { code: '¬C', label: 'Negation', polytime: 'true', refs: ['darwiche-2002'] }
    ]
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 575, y: 260 },
  children: [
    { id: 'fbdd-obdd', target: 'obdd', typeId: 'succinctness', label: '≤', description: 'FBDD is at least as succinct as OBDD', refs: ['darwiche-2002'] }
  ]
};
