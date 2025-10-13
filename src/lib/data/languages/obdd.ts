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
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'true', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
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
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['Darwiche_2002'] },
    { id: 'ordering', label: 'Ordering', color: '#22c55e', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 725, y: 260 },
  relationships: [
    { id: 'obdd-obdd-lt', target: 'obdd-lt', typeId: 'succinctness', label: '≤', description: 'OBDD is at least as succinct as OBDD<', refs: ['Darwiche_2002'] }
  ]
};
