import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dnnf: KCLanguage = {
  id: 'dnnf',
  name: 'DNNF',
  fullName: 'Decomposable Negation Normal Form',
  description: 'NNF with decomposability: conjuncts do not share variables',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'false', refs: ['darwiche-2002'] },
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
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 50, y: 180 },
  children: [
    { id: 'dnnf-d-dnnf', target: 'd-dnnf', typeId: 'succinctness', label: '≤', description: 'DNNF is at least as succinct as d-DNNF', refs: ['darwiche-2002'] }
  ]
};
