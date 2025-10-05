import type { LanguageFilter, KCLanguage } from '../../types.js';

export const propertyFilters: LanguageFilter[] = [
  {
    id: 'has-decomposability',
    name: 'Decomposability',
    description: 'Languages with decomposability property',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'decomposability') ?? false) ? language : null;
    }
  },
  {
    id: 'has-determinism',
    name: 'Determinism',
    description: 'Languages with determinism property',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'determinism') ?? false) ? language : null;
    }
  },
  {
    id: 'decision-diagrams',
    name: 'Decision Diagrams',
    description: 'Languages in the decision diagram family',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'decision') ?? false) ? language : null;
    }
  }
];
