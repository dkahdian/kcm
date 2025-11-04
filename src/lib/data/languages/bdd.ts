import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const bdd: KCLanguage = {
  id: 'bdd',
  name: 'BDD',
  fullName: 'Binary Decision Diagram',
  description: 'Decision DAGs with boolean branching on variables.',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CO: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CT: { polytime: 'exp', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'exp', refs: ['Darwiche_2002'] },
      IM: { polytime: 'exp', refs: ['Darwiche_2002'] },
      ME: { polytime: 'exp', refs: ['Darwiche_2002'] },
      SE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      VA: { polytime: 'exp', refs: ['Darwiche_2002'] }
    },
    transformations: {
      AND_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      CD: { polytime: 'poly', refs: ['Darwiche_2002'] },
      FO: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'poly', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
