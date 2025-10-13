import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dnnf: KCLanguage = {
  id: 'dnnf',
  name: 'DNNF',
  fullName: 'Decomposable Negation Normal Form',
  description: 'NNF with decomposability: conjuncts do not share variables',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
      IM: { polytime: 'true', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'true', refs: ['Darwiche_2002'] },
      ME: { polytime: 'true', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 50, y: 180 },
  relationships: [
    { id: 'dnnf-d-dnnf', target: 'd-dnnf', typeId: 'succinctness', label: '≤', description: 'DNNF is at least as succinct as d-DNNF', refs: ['Darwiche_2002'] }
  ]
};
