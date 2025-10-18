import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const sNnf: KCLanguage = {
  id: 's-nnf',
  name: 's-NNF',
  fullName: 'Smooth Negation Normal Form',
  description: 'NNF with smoothness: disjuncts mention the same set of variables',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      VA: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      IM: { polytime: 'exp', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'exp', refs: ['Darwiche_2002'] },
      SE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CT: { polytime: 'exp', refs: ['Darwiche_2002'] },
      ME: { polytime: 'exp', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'poly', refs: ['Darwiche_2002'] },
      FO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'smoothness', label: 'Smoothness', color: '#06b6d4', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
