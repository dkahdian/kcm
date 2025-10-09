import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const cnf: KCLanguage = {
  id: 'cnf',
  name: 'CNF',
  fullName: 'Conjunctive Normal Form',
  description: 'Conjunction of disjunctions of literals',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'false', refs: ['darwiche-2002'] },
      VA: { polytime: 'false', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'false', refs: ['darwiche-2002'] },
      EQ: { polytime: 'false', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'false', refs: ['darwiche-2002'] },
      ME: { polytime: 'false', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      '∧C': { polytime: 'true', refs: ['darwiche-2002'] },
      '∧BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∨BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '¬C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'cnf', label: 'CNF', color: '#ef4444', refs: ['darwiche-2002'] },
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['darwiche-2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 300, y: 300 },
  children: [
    { id: 'cnf-pi', target: 'pi', typeId: 'succinctness', label: '≤', description: 'CNF is at least as succinct as PI', refs: ['darwiche-2002'] }
  ]
};
