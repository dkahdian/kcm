import type { LanguageFilter } from '../../types.js';
import { createOperationVisualizer } from './helpers.js';

export const queryVisualizationFilters: LanguageFilter[] = [
  {
    id: 'visualize-co',
    name: 'Consistency (CO)',
    description: 'Display Consistency (CO) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CO', 'query')
  },
  {
    id: 'visualize-va',
    name: 'Validity (VA)',
    description: 'Display Validity (VA) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('VA', 'query')
  },
  {
    id: 'visualize-ce',
    name: 'Clausal Entailment (CE)',
    description: 'Display Clausal Entailment (CE) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CE', 'query')
  },
  {
    id: 'visualize-ct',
    name: 'Model Counting (CT)',
    description: 'Display Model Counting (CT) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CT', 'query')
  }
];
