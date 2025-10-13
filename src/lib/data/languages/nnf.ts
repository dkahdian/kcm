import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const nnf: KCLanguage = {
  id: 'nnf',
  name: 'NNF',
  fullName: 'Negation Normal Form',
  description: 'Boolean formulas where negation appears only at the literal level',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'false', refs: ['Darwiche_2002'] },
      IM: { polytime: 'false', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'false', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'normal-form', label: 'Normal Form', color: '#6366f1', refs: ['Darwiche_2002'] },
    { id: 'general', label: 'General', color: '#10b981', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 200, y: 100 },
  relationships: [
    { id: 'nnf-dnnf', target: 'dnnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNNF', refs: ['Darwiche_2002'] },
    { id: 'nnf-dnf', target: 'dnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNF', refs: ['Darwiche_2002'] },
    { id: 'nnf-cnf', target: 'cnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as CNF', refs: ['Darwiche_2002'] }
  ]
};
