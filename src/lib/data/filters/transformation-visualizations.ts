import type { LanguageFilter } from '../../types.js';
import { createTransformationVisualizationFilters } from './operation-visualizations.js';
import { TRANSFORMATIONS } from '../operations.js';

export const transformationVisualizationFilters: LanguageFilter[] =
	createTransformationVisualizationFilters(
		Object.entries(TRANSFORMATIONS).map(([safeKey, op]) => ({
			id: safeKey,
			code: op.code,
			name: op.label
		}))
	);
