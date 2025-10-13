import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const mods: KCLanguage = {
  id: 'mods',
  name: 'MODS',
  fullName: 'Models',
  description: 'Representation by models (complete assignments)',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['Darwiche_2002'] },
      VA: { polytime: 'true', refs: ['Darwiche_2002'] },
      CE: { polytime: 'true', refs: ['Darwiche_2002'] },
      IM: { polytime: 'true', refs: ['Darwiche_2002'] },
      EQ: { polytime: 'true', refs: ['Darwiche_2002'] },
      SE: { polytime: 'true', refs: ['Darwiche_2002'] },
      CT: { polytime: 'true', refs: ['Darwiche_2002'] },
      ME: { polytime: 'true', refs: ['Darwiche_2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['Darwiche_2002'] },
      FO: { polytime: 'true', refs: ['Darwiche_2002'] },
      SFO: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      AND_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_C: { polytime: 'true', refs: ['Darwiche_2002'] },
      OR_BC: { polytime: 'true', refs: ['Darwiche_2002'] },
      NOT_C: { polytime: 'true', refs: ['Darwiche_2002'] }
    }
  },
  tags: [
    { id: 'models', label: 'Models', color: '#eab308', refs: ['Darwiche_2002'] }
  ],
  references: getReferences('Darwiche_2002'),
  position: { x: 800, y: 300 }
};
