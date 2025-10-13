import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fNnf: KCLanguage = {
  id: 'f-nnf',
  name: 'f-NNF',
  fullName: 'Flat Negation Normal Form',
  description: 'NNF with flatness: height at most 2',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'false', refs: ['Darwiche_2002'] },
      IM: { polytime: 'false', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'false', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 500, y: 180 }
};
