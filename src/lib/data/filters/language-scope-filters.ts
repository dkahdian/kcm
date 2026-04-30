import type {
  GraphData,
  KCLanguage,
  LanguageClassification,
  LanguageFilter,
  LanguageVisibilityParam
} from '../../types.js';
import { mapLanguagesInDataset } from '../transforms.js';
import { LANGUAGE_CLASSIFICATIONS } from '../language-classifications.js';

const DEFAULT_HIDDEN_UNION_LANGUAGE_IDS = Object.entries(LANGUAGE_CLASSIFICATIONS)
  .filter(([, classification]) => classification === 'union')
  .map(([id]) => id);

export const ORIGINAL_KCM_LANGUAGE_IDS = [
  'lang_89649e36', // CNF
  'lang_6c130090', // d-DNNF
  'lang_4c204bf3', // DNF
  'lang_3bebcab7', // DNNF
  'lang_684b1ca7', // FBDD
  'lang_6ae90adc', // IP
  'lang_e02902d0', // MODS
  'lang_5bf00851', // NNF
  'lang_b9d72a7c', // OBDD
  'lang_27fffab2' // PI
];

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
  defaultParamMatrix: { mode: 'except', ids: DEFAULT_HIDDEN_UNION_LANGUAGE_IDS },
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
