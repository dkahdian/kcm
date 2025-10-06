import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fNnf: KCLanguage = {
  id: 'f-nnf',
  name: 'f-NNF',
  fullName: 'Flat Negation Normal Form',
  description: 'NNF with flatness: height at most 2',
  descriptionRefs: ['darwiche-2002'],
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
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 500, y: 180 }
};
