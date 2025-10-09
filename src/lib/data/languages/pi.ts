import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const pi: KCLanguage = {
  id: 'pi',
  name: 'PI',
  fullName: 'Prime Implicates',
  description: 'Representation by the set of prime implicates',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'false', refs: ['darwiche-2002'] },
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
    { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6', refs: ['darwiche-2002'] },
    { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 500, y: 300 },
  children: [
    { id: 'pi-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'PI is at least as succinct as MODS', refs: ['darwiche-2002'] }
  ]
};
