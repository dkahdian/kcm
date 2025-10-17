import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const ip: KCLanguage = {
  id: 'ip',
  name: 'IP',
  fullName: 'Prime Implicants',
  description: 'Representation by the set of prime implicants',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'true', refs: ['Darwiche_2002'] },
      CE: { polytime: 'false', refs: ['Darwiche_2002'] },
      IM: { polytime: 'true', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'true', refs: ['Darwiche_2002'] },
      SE: { polytime: 'true', refs: ['Darwiche_2002'] },
      CT: { polytime: 'true', refs: ['Darwiche_2002'] },
      ME: { polytime: 'true', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'true', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'prime-implicants', label: 'Prime Implicants', color: '#3b82f6', refs: ['Darwiche_2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
