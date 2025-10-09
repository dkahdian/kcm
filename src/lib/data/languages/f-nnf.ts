import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fNnf: KCLanguage = {
  id: 'f-nnf',
  name: 'f-NNF',
  fullName: 'Flat Negation Normal Form',
  description: 'NNF with flatness: height at most 2',
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
      '∧C': { polytime: 'true', refs: ['darwiche-2002'] },
      '∧BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      '∨BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '¬C': { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'flatness', label: 'Flatness', color: '#7c3aed', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 500, y: 180 }
};
