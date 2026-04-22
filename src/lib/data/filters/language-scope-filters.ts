import type {
  GraphData,
  KCLanguage,
  LanguageClassification,
  LanguageFilter,
  LanguageVisibilityParam
} from '../../types.js';
import { mapLanguagesInDataset } from '../transforms.js';

function getLanguageClassification(language: KCLanguage): LanguageClassification {
  return language.classification ?? 'plain';
}

function shouldKeepForVisibility(language: KCLanguage, visibility: LanguageVisibilityParam): boolean {
  const ids = new Set(visibility.ids);

  switch (visibility.mode) {
    case 'all':
      return true;
    case 'only':
      return ids.has(language.id);
    case 'except':
      return !ids.has(language.id);
    default:
      return true;
  }
}

export const languageVisibilityFilter: LanguageFilter<LanguageVisibilityParam> = {
  id: 'language-visibility',
  name: 'Visible Languages',
  description: 'Search for languages and include or exclude them in bulk',
  applicableViews: ['graph', 'succinctness', 'queries', 'transforms'],
  uiGroup: 'Language Scope',
  kind: 'language-visibility',
  defaultParam: { mode: 'all', ids: [] },
  controlType: 'language-picker',
  lambda: (data: GraphData, visibility) => {
    if (visibility.mode === 'all') {
      return data;
    }

    return mapLanguagesInDataset(data, (language) => {
      return shouldKeepForVisibility(language, visibility) ? language : null;
    });
  }
};

export const languageScopeFilters: LanguageFilter<any>[] = [languageVisibilityFilter];
