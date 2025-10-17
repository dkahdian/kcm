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
    {
      id: 'nnf-dnnf',
      target: 'dnnf',
      forwardStatus: 'poly',  // Type 1: Polynomial transformation exists
      backwardStatus: 'no-quasi',  // Reverse: No quasi-polynomial
      description: 'NNF ≤_p DNNF, DNNF ⊄_q NNF',
      refs: ['Darwiche_2002']
    },
    {
      id: 'nnf-dnf',
      target: 'dnf',
      forwardStatus: 'no-poly-unknown-quasi',  // Type 2: No poly, unknown quasi
      backwardStatus: 'unknown-both',  // Reverse: Both unknown
      description: 'NNF ⊄_p DNF and ?≤_q DNF, DNF ?≤_p and ?≤_q NNF',
      refs: ['Darwiche_2002']
    },
    {
      id: 'nnf-cnf',
      target: 'cnf',
      forwardStatus: 'no-poly-quasi',  // Type 3: No poly, has quasi
      backwardStatus: 'unknown-poly-quasi',  // Type 4: Unknown poly, has quasi
      description: 'NNF ⊄_p but ≤_q CNF, CNF ?≤_p but ≤_q NNF',
      refs: ['Darwiche_2002']
    }
  ]
};
