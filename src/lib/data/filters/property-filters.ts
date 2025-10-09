import type { LanguageFilter, KCLanguage } from '../../types.js';

export const propertyFilters: LanguageFilter[] = [
  {
    id: 'has-decomposability',
    name: 'Decomposability',
    description: 'Languages with decomposability property',
    category: 'Filter by Property',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage, param: boolean) => {
      // If param is false, pass through all languages
      if (!param) return language;
      // If param is true, only show languages with decomposability
      return (language.tags?.some(tag => tag.id === 'decomposability') ?? false) ? language : null;
    }
  },
  {
    id: 'has-determinism',
    name: 'Determinism',
    description: 'Languages with determinism property',
    category: 'Filter by Property',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage, param: boolean) => {
      // If param is false, pass through all languages
      if (!param) return language;
      // If param is true, only show languages with determinism
      return (language.tags?.some(tag => tag.id === 'determinism') ?? false) ? language : null;
    }
  },
  {
    id: 'decision-diagrams',
    name: 'Decision Diagrams',
    description: 'Languages in the decision diagram family',
    category: 'Filter by Property',
    defaultParam: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage, param: boolean) => {
      // If param is false, pass through all languages
      if (!param) return language;
      // If param is true, only show languages in the decision diagram family
      return (language.tags?.some(tag => tag.id === 'decision') ?? false) ? language : null;
    }
  }
];
