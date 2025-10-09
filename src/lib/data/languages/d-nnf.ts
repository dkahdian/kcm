import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dNnf: KCLanguage = {
  id: 'd-nnf',
  name: 'd-NNF',
  fullName: 'Deterministic Negation Normal Form',
  description: 'NNF with determinism: disjuncts are logically disjoint',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'false', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'false', refs: ['darwiche-2002'] },
      ME: { polytime: 'false', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 200, y: 180 }
};
