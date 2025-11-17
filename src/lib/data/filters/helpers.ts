import type { KCLanguage, LanguageFilter, GraphData, FilterCategory } from '../../types.js';
import { resolveLanguageProperties } from '../operations.js';
import { getPolytimeFlag } from '../polytime-complexities.js';

/**
 * Helper function to create visualization filters for queries and transformations.
 * Adds emoji indicators and operation codes to node labels.
 */
export function createOperationVisualizer(
  code: string,
  type: 'query' | 'transformation'
): (language: KCLanguage, param: boolean) => KCLanguage {
  return (language: KCLanguage, param: boolean) => {
    // If param is false, return immediately without adding visualization
    if (!param) return language;
    
    // Resolve the language properties to get full operation entries
    const resolved = resolveLanguageProperties(
      language.properties.queries,
      language.properties.transformations
    );
    
    const operations = type === 'query' ? resolved.queries : resolved.transformations;
    const operation = operations?.find(op => op.code === code);
    if (!operation) return language;
    
    // Get the full polytime flag object
    const polytimeFlag = getPolytimeFlag(operation.polytime);
    const suffix = `\n${polytimeFlag.emoji}${code}`;
    
    return {
      ...language,
      visual: {
        ...language.visual,
        labelSuffix: (language.visual?.labelSuffix || '') + suffix
      }
    };
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
    lambda: (language: KCLanguage, param: boolean) => {
      // If param is true, pass the language through if it matches
      // If param is false, filter out (hide) the language if it matches
      if (language.name === lang.name) {
        return param ? language : null;
      }
      return language;
    }
  }));
}

/**
 * Creates a hidden filter that fills in missing operations with 'unknown' complexity.
 * This ensures all languages have all standard operations defined in their properties,
 * with unspecified ones automatically marked as 'unknown'.
 */
export function createFillUnknownOperationsFilter(): LanguageFilter {
  return {
    id: 'fill-unknown-operations',
    name: 'Fill Unknown Operations',
    description: 'Automatically adds missing operations as "unknown" complexity',
    hidden: true, // This is an internal filter - not shown in UI
    defaultParam: true,
    lambda: (language: KCLanguage, param: boolean) => {
      // If param is false, return language unchanged
      if (!param) return language;
      
      // Resolve operations to fill in any missing ones with 'unknown'
      const resolved = resolveLanguageProperties(
        language.properties.queries,
        language.properties.transformations
      );
      
      // Convert resolved arrays back to map format
      const queriesMap: any = {};
      for (const op of resolved.queries) {
        queriesMap[op.code] = {
          polytime: op.polytime,
          ...(op.note && { note: op.note }),
          refs: op.refs
        };
      }
      
      const transformationsMap: any = {};
      for (const op of resolved.transformations) {
        transformationsMap[op.code] = {
          polytime: op.polytime,
          ...(op.note && { note: op.note }),
          refs: op.refs
        };
      }
      
      // Return language with fully resolved properties
      return {
        ...language,
        properties: {
          queries: queriesMap,
          transformations: transformationsMap
        }
      };
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
