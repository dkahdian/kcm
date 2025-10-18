import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const pi: KCLanguage = {
  id: 'pi',
  name: 'PI',
  fullName: 'Prime Implicates',
  description: 'Representation by the set of prime implicates',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      VA: { polytime: 'poly', refs: ['Darwiche_2002'] },
      CE: { polytime: 'poly', refs: ['Darwiche_2002'] },
      IM: { polytime: 'exp', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'poly', refs: ['Darwiche_2002'] },
      SE: { polytime: 'poly', refs: ['Darwiche_2002'] },
      CT: { polytime: 'poly', refs: ['Darwiche_2002'] },
      ME: { polytime: 'poly', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'poly', refs: ['Darwiche_2002'] },
      FO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'poly', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6', refs: ['Darwiche_2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
