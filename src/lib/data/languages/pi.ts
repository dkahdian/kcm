import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const pi: KCLanguage = {
  id: 'pi',
  name: 'PI',
  fullName: 'Prime Implicates',
  description: 'Representation by the set of prime implicates',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: [
      { code: 'CO', label: 'Consistency', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'VA', label: 'Validity', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'CE', label: 'Clausal Entailment', polytime: 'true', refs: ['darwiche-2002'] },
      { code: 'IM', label: 'Implicant', polytime: 'false', refs: ['darwiche-2002'] },
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
    { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6', refs: ['darwiche-2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 500, y: 300 },
  children: [
    { id: 'pi-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'PI is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
