import type { LanguageFilter, GraphData, FilterCategory } from '../../types.js';
import { QUERIES, TRANSFORMATIONS, resolveLanguageProperties } from '../operations.js';
import { getComplexityFromCatalog } from '../complexities.js';
import { mapLanguagesInDataset } from '../transforms.js';

/**
 * Helper function to create visualization filters for queries and transformations.
 * Adds emoji and operation codes to node labels (vertically stacked).
 */
export function createOperationVisualizer(
  code: string,
  type: 'query' | 'transformation'
): (data: GraphData, param: boolean) => GraphData {
  return (data: GraphData, param: boolean) => {
    if (!param) return data;
    return mapLanguagesInDataset(data, (language) => {
      const resolved = resolveLanguageProperties(
        language.properties.queries,
        language.properties.transformations
      );

      const operations = type === 'query' ? resolved.queries : resolved.transformations;
      const operation = operations?.find((op) => op.code === code);
      if (!operation) return language;

      const complexity = getComplexityFromCatalog(data.complexities, operation.complexity);
      // Use emoji for operation display (vertically stacked, one per line)
      const suffix = `\n${complexity.emoji} ${code}`;

      return {
        ...language,
        visual: {
          ...language.visual,
          labelSuffix: (language.visual?.labelSuffix || '') + suffix
        }
      };
    });
  };
}

/**
 * Generates individual language selection filters dynamically.
 * Creates a filter for each language that controls visibility of that specific language.
 */
export function generateLanguageSelectionFilters(graphData: GraphData): LanguageFilter[] {
  return graphData.languages.map(lang => ({
    id: `select-${lang.name}`,
    name: lang.name,
    description: `Show ${lang.fullName}`,
    category: 'Show Languages',
    defaultParam: true, // All languages visible by default
    controlType: 'checkbox' as const,
    lambda: (data: GraphData, param: boolean) => {
      if (param) return data;
      return mapLanguagesInDataset(data, (language) => {
        return language.name === lang.name ? null : language;
      });
    }
  }));
}

/**
 * Creates a hidden filter that normalizes operation data by resolving safe keys to operation codes.
 * Only includes operations that have explicit data in the source; missing operations stay absent
 * (rendered as blank cells in the matrix).
 */
export function createFillUnknownOperationsFilter(): LanguageFilter {
  return {
    id: 'fill-unknown-operations',
    name: 'Fill Unknown Operations',
    description: 'Normalizes operation keys without adding unknown entries',
    hidden: true, // This is an internal filter - not shown in UI
    defaultParam: true,
    lambda: (data: GraphData, param: boolean) => {
      if (!param) return data;
      return mapLanguagesInDataset(data, (language) => {
        const normalizeOps = (
          supportMap: Record<string, any> | undefined,
          operationDefs: Record<string, any>
        ): Record<string, any> => {
          const result: Record<string, any> = {};
          if (!supportMap) return result;

          for (const [safeKey, opDef] of Object.entries(operationDefs)) {
            const support = supportMap[safeKey] || supportMap[opDef.code];
            if (support) {
              result[opDef.code] = {
                complexity: support.complexity,
                ...(support.caveat && { caveat: support.caveat }),
                refs: support.refs ?? [],
                ...(support.description && { description: support.description }),
                ...(support.derived != null && { derived: support.derived }),
                ...(support.dimmed != null && { dimmed: support.dimmed }),
                ...(support.explicit != null && { explicit: support.explicit })
              };
            }
          }
          return result;
        };

        return {
          ...language,
          properties: {
            queries: normalizeOps(language.properties.queries, QUERIES),
            transformations: normalizeOps(language.properties.transformations, TRANSFORMATIONS)
          }
        };
      });
    }
  };
}

/**
 * Organizes filters into categories for display.
 */
export function organizeFiltersByCategory(filters: LanguageFilter[]): FilterCategory[] {
  const categorizedFilters = filters.filter(f => f.category);
  
  const categoryMap = new Map<string, LanguageFilter[]>();
  
  categorizedFilters.forEach(filter => {
    const categoryName = filter.category!;
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, []);
    }
    categoryMap.get(categoryName)!.push(filter);
  });
  
  const categories: FilterCategory[] = Array.from(categoryMap.entries()).map(([name, filters]) => ({
    name, // Use the original category name as-is
    filters
  }));
  
  return categories;
}
