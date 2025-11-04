import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const fakeLang: KCLanguage = {
  id: 'fake-lang',
  name: 'Fake-lang',
  fullName: 'Fake language for testing',
  description: 'Fake language used for testing purposes',
  descriptionRefs: ['Darwiche_2002'],
  properties: {
    queries: {
      CE: { polytime: 'unknown', refs: [] },
      CO: { polytime: 'poly', refs: ['Darwiche_2002'] },
      CT: { polytime: 'unknown', refs: [] },
      EQ: { polytime: 'unknown', refs: [] },
      IM: { polytime: 'unknown', refs: [] },
      ME: { polytime: 'unknown', refs: [] },
      SE: { polytime: 'unknown', refs: [] },
      VA: { polytime: 'unknown', refs: [] }
    },
    transformations: {
      AND_BC: { polytime: 'not-poly-conditional', refs: ['Darwiche_2002'] },
      AND_C: { polytime: 'unknown', refs: [] },
      CD: { polytime: 'unknown', refs: [] },
      FO: { polytime: 'unknown', refs: [] },
      NOT_C: { polytime: 'unknown', refs: [] },
      OR_BC: { polytime: 'unknown', refs: [] },
      OR_C: { polytime: 'unknown', refs: [] },
      SFO: { polytime: 'unknown', refs: [] }
    }
  },
  tags: [
    { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6', refs: [] },
    { id: 'dnf', label: 'DNF', color: '#f59e0b', refs: [] }
  ],
  references: []
};
