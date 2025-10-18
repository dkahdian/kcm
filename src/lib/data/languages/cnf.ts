import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const cnf: KCLanguage = {
  id: 'cnf',
  name: 'CNF',
  fullName: 'Conjunctive Normal Form',
  description: 'Conjunction of disjunctions of literals',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'exp', refs: ['Darwiche_2002'] },
      VA: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CE: { polytime: 'poly', refs: ['Darwiche_2002'] },
      IM: { polytime: 'exp', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'exp', refs: ['Darwiche_2002'] },
      SE: { polytime: 'exp', refs: ['Darwiche_2002'] },
      CT: { polytime: 'exp', refs: ['Darwiche_2002'] },
      ME: { polytime: 'exp', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'poly', refs: ['Darwiche_2002'] },
      FO: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'poly', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'poly', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'not-poly-conditional', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'cnf', label: 'CNF', color: '#ef4444', refs: ['Darwiche_2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['Darwiche_2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002')
};
