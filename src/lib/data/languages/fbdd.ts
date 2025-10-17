import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fbdd: KCLanguage = {
  id: 'fbdd',
  name: 'FBDD',
  fullName: 'Free Binary Decision Diagram',
  description: 'BDD without a fixed variable ordering (free order)',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'false', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'false', refs: ['Darwiche_2002'] },
      IM: { polytime: 'false', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'unknown', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'false', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'true', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 575, y: 260 },
  relationships: [
    {
      id: 'fbdd-obdd',
      target: 'obdd',
      forwardStatus: 'poly',
      backwardStatus: 'no-quasi',
      description: 'Relationship between FBDD and OBDD',
      refs: ['Darwiche_2002']
    }
  ]
};
