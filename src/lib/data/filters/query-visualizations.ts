import type { LanguageFilter } from '../../types.js';
import { createQueryVisualizationFilters } from './operation-visualizations.js';

export const queryVisualizationFilters: LanguageFilter[] = createQueryVisualizationFilters([
	{ code: 'CO', name: 'Consistency' },
	{ code: 'VA', name: 'Validity' },
	{ code: 'CE', name: 'Clausal Entailment' },
	{ code: 'CT', name: 'Model Counting' }
]);
