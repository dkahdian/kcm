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
      CO: { polytime: 'false', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
      IM: { polytime: 'false', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'false', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'cnf', label: 'CNF', color: '#ef4444', refs: ['Darwiche_2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['Darwiche_2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 300, y: 300 }
};
