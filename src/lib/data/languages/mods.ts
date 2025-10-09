import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const mods: KCLanguage = {
  id: 'mods',
  name: 'MODS',
  fullName: 'Models',
  description: 'Representation by models (complete assignments)',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
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
    { id: 'models', label: 'Models', color: '#eab308', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 800, y: 300 }
};
