import type { LanguageFilter } from '../../types.js';
import { createTransformationVisualizationFilters } from './operation-visualizations.js';

export const transformationVisualizationFilters: LanguageFilter[] =
	createTransformationVisualizationFilters([
		{ code: 'CD', name: 'Conditioning' },
		{ code: 'FO', name: 'Forgetting' },
		{ code: '∧C', name: 'Conjunction' },
		{ code: '¬C', name: 'Negation' }
	]);
