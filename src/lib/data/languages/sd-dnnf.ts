import type { KCLanguage } from '../../types.js';
import { getReferences } from '../references.js';

export const sdDnnf: KCLanguage = {
  id: 'sd-dnnf',
  name: 'sd-DNNF',
  fullName: 'Smooth Deterministic Decomposable Negation Normal Form',
  description: 'd-DNNF with smoothness',
  descriptionRefs: ['darwiche-2002'],
  properties: {
    queries: {
      CO: { polytime: 'true', refs: ['darwiche-2002'] },
      VA: { polytime: 'true', refs: ['darwiche-2002'] },
      CE: { polytime: 'true', refs: ['darwiche-2002'] },
      IM: { polytime: 'true', refs: ['darwiche-2002'] },
      EQ: { polytime: 'unknown', refs: ['darwiche-2002'] },
      SE: { polytime: 'false', refs: ['darwiche-2002'] },
      CT: { polytime: 'true', refs: ['darwiche-2002'] },
      ME: { polytime: 'true', refs: ['darwiche-2002'] }
    },
    transformations: {
      CD: { polytime: 'true', refs: ['darwiche-2002'] },
      FO: { polytime: 'true', refs: ['darwiche-2002'] },
      SFO: { polytime: 'true', refs: ['darwiche-2002'] },
      AND_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      AND_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      OR_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] },
      OR_BC: { polytime: 'true', refs: ['darwiche-2002'] },
      NOT_C: { polytime: 'false', note: 'Unless P=NP', refs: ['darwiche-2002'] }
    }
  },
  tags: [
    { id: 'decomposability', label: 'Decomposability', color: '#84cc16', refs: ['darwiche-2002'] },
    { id: 'determinism', label: 'Determinism', color: '#ef4444', refs: ['darwiche-2002'] },
    { id: 'smoothness', label: 'Smoothness', color: '#06b6d4', refs: ['darwiche-2002'] }
  ],
  references: getReferences('darwiche-2002'),
  position: { x: 275, y: 260 },
  children: [
    { id: 'sd-dnnf-equiv-d-dnnf', target: 'd-dnnf', typeId: 'equivalence', label: '≡', description: 'sd-DNNF is equivalent to d-DNNF', refs: ['darwiche-2002'] }
  ]
};
