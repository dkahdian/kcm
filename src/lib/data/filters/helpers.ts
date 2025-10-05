import type { KCLanguage, LanguageFilter, GraphData, FilterCategory } from '../../types.js';

/**
 * Helper function to create visualization filters for queries and transformations.
 * Adds emoji indicators (🟢🔴🟡) and operation codes to node labels.
 */
export function createOperationVisualizer(
  code: string,
  type: 'query' | 'transformation'
): (language: KCLanguage) => KCLanguage {
  return (language: KCLanguage) => {
    const operations = type === 'query' ? language.properties.queries : language.properties.transformations;
    const operation = operations?.find(op => op.code === code);
    if (!operation) return language;
    
    const colorMap = { 'true': '🟢', 'false': '🔴', 'unknown': '🟡' };
    const icon = colorMap[operation.polytime];
    const note = operation.note ? '*' : '';
    const suffix = `\n${icon}${code}${note}`;
    
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
 * Creates a filter for each language that allows hiding that specific language.
 */
export function generateLanguageSelectionFilters(graphData: GraphData): LanguageFilter[] {
  return graphData.languages.map(lang => ({
    id: `select-${lang.id}`,
    name: lang.name,
    description: `Hide ${lang.fullName}`,
    category: 'Hide Any Language',
    activeByDefault: false, // All languages visible by default
    controlType: 'checkbox' as const,
    lambda: (language: KCLanguage) => {
      // Only hide the language if it matches this filter's target
      return language.id !== lang.id ? language : null;
    }
  }));
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
