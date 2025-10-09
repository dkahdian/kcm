import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const nnf: KCLanguage = {
  id: 'nnf',
  name: 'NNF',
  fullName: 'Negation Normal Form',
  description: 'Boolean formulas where negation appears only at the literal level',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
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
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'normal-form', label: 'Normal Form', color: '#6366f1', refs: ['darwiche-2002'] },
    { id: 'general', label: 'General', color: '#10b981', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 200, y: 100 },
  children: [
    { id: 'nnf-dnnf', target: 'dnnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNNF', refs: ['darwiche-2002'] },
    { id: 'nnf-dnf', target: 'dnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNF', refs: ['darwiche-2002'] },
    { id: 'nnf-cnf', target: 'cnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as CNF', refs: ['darwiche-2002'] }
  ]
};
