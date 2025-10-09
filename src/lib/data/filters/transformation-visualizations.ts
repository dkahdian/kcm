import type { LanguageFilter } from '../../types.js';
import { createOperationVisualizer } from './helpers.js';

export const transformationVisualizationFilters: LanguageFilter[] = [
  {
    id: 'visualize-cd',
    name: 'Conditioning (CD)',
    description: 'Display Conditioning (CD) status on nodes',
    category: 'Visualize Transformations',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CD', 'transformation')
  },
  {
    id: 'visualize-fo',
    name: 'Forgetting (FO)',
    description: 'Display Forgetting (FO) status on nodes',
    category: 'Visualize Transformations',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('FO', 'transformation')
  },
  {
    id: 'visualize-conjunction',
    name: 'Conjunction (∧C)',
    description: 'Display Conjunction (∧C) status on nodes',
    category: 'Visualize Transformations',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('∧C', 'transformation')
  },
  {
    id: 'visualize-negation',
    name: 'Negation (¬C)',
    description: 'Display Negation (¬C) status on nodes',
    category: 'Visualize Transformations',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('¬C', 'transformation')
  }
];
