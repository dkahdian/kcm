import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const obddLt: KCLanguage = {
  id: 'obdd-lt',
  name: 'OBDD<',
  fullName: 'Ordered Binary Decision Diagram (using order <)',
  description: 'OBDDs under a specific ordering constraint (<)',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'true', refs: ['darwiche-2002'] },
      SE: { polytime: 'true', refs: ['darwiche-2002'] },
      CT: { polytime: 'true', refs: ['darwiche-2002'] },
      ME: { polytime: 'true', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'true', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['darwiche-2002'] },
    { id: 'ordering', label: 'Ordering', color: '#22c55e', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 875, y: 260 },
  children: [
    { id: 'obdd-lt-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'OBDD< is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
