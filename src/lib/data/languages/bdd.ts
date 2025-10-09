import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const bdd: KCLanguage = {
  id: 'bdd',
  name: 'BDD',
  fullName: 'Binary Decision Diagram',
  description: 'Decision DAGs with boolean branching on variables',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'false', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'false', refs: ['darwiche-2002'] },
      IM: { polytime: 'false', refs: ['darwiche-2002'] },
      EQ: { polytime: 'false', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'false', refs: ['darwiche-2002'] },
      ME: { polytime: 'false', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'true', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 425, y: 260 }
};
