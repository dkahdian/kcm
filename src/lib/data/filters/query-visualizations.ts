import type { LanguageFilter } from '../../types.js';
import { createQueryVisualizationFilters } from './operation-visualizations.js';
import { QUERIES } from '../operations.js';

export const queryVisualizationFilters: LanguageFilter[] = createQueryVisualizationFilters(
	Object.entries(QUERIES).map(([safeKey, op]) => ({
		id: safeKey,
		code: op.code,
		name: op.label
	}))
);
