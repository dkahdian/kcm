import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fbdd: KCLanguage = {
  id: 'fbdd',
  name: 'FBDD',
  fullName: 'Free Binary Decision Diagram',
  description: 'BDD without a fixed variable ordering (free order)',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'false', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'false', refs: ['darwiche-2002'] },
      IM: { polytime: 'false', refs: ['darwiche-2002'] },
      EQ: { polytime: 'unknown', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'false', refs: ['darwiche-2002'] },
      ME: { polytime: 'false', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      '∧C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∧BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∨BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '¬C': { polytime: 'true', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'decision', label: 'Decision', color: '#f59e0b', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 575, y: 260 },
  children: [
    { id: 'fbdd-obdd', target: 'obdd', typeId: 'succinctness', label: '≤', description: 'FBDD is at least as succinct as OBDD', refs: ['darwiche-2002'] }
  ]
};
