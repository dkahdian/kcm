import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dNnf: KCLanguage = {
  id: 'd-nnf',
  name: 'd-NNF',
  fullName: 'Deterministic Negation Normal Form',
  description: 'NNF with determinism: disjuncts are logically disjoint',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
      IM: { polytime: 'true', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'false', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 200, y: 180 }
};
