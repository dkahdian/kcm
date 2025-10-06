import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const ip: KCLanguage = {
  id: 'ip',
  name: 'IP',
  fullName: 'Prime Implicants',
  description: 'Representation by the set of prime implicants',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'false', refs: ['darwiche-2002'] },
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
    { id: 'prime-implicants', label: 'Prime Implicants', color: '#3b82f6', refs: ['darwiche-2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 650, y: 300 },
  children: [
    { id: 'ip-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'IP is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
