import type { LanguageFilter } from '../../types.js';
import { createOperationVisualizer } from './helpers.js';

type OperationVisualizationConfig = {
	id?: string;
	code: string;
	name: string;
	description?: string;
};

function createVisualizationFilter(
	config: OperationVisualizationConfig,
	type: 'query' | 'transformation',
	category: string
): LanguageFilter {
	const idBase = config.id ?? config.code;
	const id = `visualize-${idBase.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
	const description =
		config.description || `Display ${config.name} (${config.code}) status on nodes`;

	return {
		id,
		name: `${config.name} (${config.code})`,
		description,
		applicableViews: ['graph'],
		uiGroup: 'Advanced',
		advanced: true,
		kind: 'operation-visualization',
		category,
		defaultParam: false,
		controlType: 'checkbox',
		lambda: createOperationVisualizer(config.code, type)
	};
}

export function createQueryVisualizationFilters(
	operations: OperationVisualizationConfig[]
): LanguageFilter[] {
	return operations.map((op) => createVisualizationFilter(op, 'query', 'Visualize Queries'));
}

export function createTransformationVisualizationFilters(
	operations: OperationVisualizationConfig[]
): LanguageFilter[] {
	return operations.map((op) =>
		createVisualizationFilter(op, 'transformation', 'Visualize Transformations')
	);
}
