import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dDnnf: KCLanguage = {
  id: 'd-dnnf',
  name: 'd-DNNF',
  fullName: 'Deterministic Decomposable Negation Normal Form',
  description: 'DNNF with determinism',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      VA: { polytime: 'poly', refs: ['Darwiche_2002'] },
      CE: { polytime: 'poly', refs: ['Darwiche_2002'] },
      IM: { polytime: 'poly', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'unknown', refs: ['Darwiche_2002'] },
      SE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CT: { polytime: 'poly', refs: ['Darwiche_2002'] },
      ME: { polytime: 'poly', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'poly', refs: ['Darwiche_2002'] },
      FO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: ['Darwiche_2002'] },
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
