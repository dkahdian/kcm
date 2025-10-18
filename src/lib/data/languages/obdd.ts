import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const obdd: KCLanguage = {
  id: 'obdd',
  name: 'OBDD',
  fullName: 'Ordered Binary Decision Diagram',
  description: 'BDD with a fixed variable ordering',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      VA: { polytime: 'poly', refs: ['Darwiche_2002'] },
      CE: { polytime: 'poly', refs: ['Darwiche_2002'] },
      IM: { polytime: 'poly', refs: ['Darwiche_2002'] },
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
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['Darwiche_2002'] },
    { id: 'ordering', label: 'Ordering', color: '#22c55e', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
