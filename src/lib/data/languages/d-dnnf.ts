import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dDnnf: KCLanguage = {
  id: 'd-dnnf',
  name: 'd-DNNF',
  fullName: 'Deterministic Decomposable Negation Normal Form',
  description: 'DNNF with determinism',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'unknown', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'true', refs: ['darwiche-2002'] },
      ME: { polytime: 'true', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      '∧C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∧BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∨BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '¬C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: ['darwiche-2002'] },
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 125, y: 260 },
  children: [
    { id: 'd-dnnf-fbdd', target: 'fbdd', typeId: 'succinctness', label: '≤', description: 'd-DNNF is at least as succinct as FBDD', refs: ['darwiche-2002'] }
  ]
};
