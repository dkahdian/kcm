import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dnf: KCLanguage = {
  id: 'dnf',
  name: 'DNF',
  fullName: 'Disjunctive Normal Form',
  description: 'Disjunction of conjunctions of literals',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'false', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
      IM: { polytime: 'true', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'false', refs: ['Darwiche_2002'] },
      SE: { polytime: 'false', refs: ['Darwiche_2002'] },
      CT: { polytime: 'false', refs: ['Darwiche_2002'] },
      ME: { polytime: 'true', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'dnf', label: 'DNF', color: '#f59e0b', refs: ['Darwiche_2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['Darwiche_2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 100, y: 300 },
  relationships: [
    { id: 'dnf-ip', target: 'ip', typeId: 'succinctness', label: '≤', description: 'DNF is at least as succinct as IP', refs: ['Darwiche_2002'] }
  ]
};
