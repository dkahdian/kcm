import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const dnf: KCLanguage = {
  id: 'dnf',
  name: 'DNF',
  fullName: 'Disjunctive Normal Form',
  description: 'Disjunction of conjunctions of literals',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'false', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'false', refs: ['darwiche-2002'] },
      ME: { polytime: 'true', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'dnf', label: 'DNF', color: '#f59e0b', refs: ['darwiche-2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['darwiche-2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 100, y: 300 },
  children: [
    { id: 'dnf-ip', target: 'ip', typeId: 'succinctness', label: '≤', description: 'DNF is at least as succinct as IP', refs: ['darwiche-2002'] }
  ]
};
