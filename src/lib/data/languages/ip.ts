import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const ip: KCLanguage = {
  id: 'ip',
  name: 'IP',
  fullName: 'Prime Implicants',
  description: 'Representation by the set of prime implicants',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'false', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'true', refs: ['darwiche-2002'] },
      SE: { polytime: 'true', refs: ['darwiche-2002'] },
      CT: { polytime: 'true', refs: ['darwiche-2002'] },
      ME: { polytime: 'true', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      '∧C': { polytime: 'true', refs: ['darwiche-2002'] },
      '∧BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨C': { polytime: 'true', refs: ['darwiche-2002'] },
      '∨BC': { polytime: 'true', refs: ['darwiche-2002'] },
      '¬C': { polytime: 'true', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'prime-implicants', label: 'Prime Implicants', color: '#3b82f6', refs: ['darwiche-2002'] },
    { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 650, y: 300 },
  children: [
    { id: 'ip-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'IP is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
