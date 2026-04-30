<script lang="ts">
  import MathText from './MathText.svelte';
  import type { KCLanguage, LanguageClassification, LanguageVisibilityParam } from '$lib/types.js';
  import { ORIGINAL_KCM_LANGUAGE_IDS } from '$lib/data/filters/language-scope-filters.js';

  let {
    languages = [],
    value,
    onChange
  }: {
    languages?: KCLanguage[];
    value: LanguageVisibilityParam;
    onChange: (value: LanguageVisibilityParam) => void;
  } = $props();

  let search = $state('');

  function getSortedLanguages(items: KCLanguage[]): KCLanguage[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }

  const sortedLanguages = $derived(getSortedLanguages(languages));

  const filteredLanguages = $derived(
    sortedLanguages.filter((language) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return (
        language.name.toLowerCase().includes(needle) ||
        language.fullName.toLowerCase().includes(needle)
      );
    })
  );

  function getVisibleIds(param: LanguageVisibilityParam): Set<string> {
    const ids = new Set(param.ids);

    switch (param.mode) {
      case 'all':
        return new Set(languages.map((language) => language.id));
      case 'only':
        return ids;
      case 'except':
        return new Set(
          languages
            .map((language) => language.id)
            .filter((languageId) => !ids.has(languageId))
        );
      default:
        return new Set(languages.map((language) => language.id));
    }
  }

  function normalizeFromVisibleIds(visibleIds: Set<string>): LanguageVisibilityParam {
    const allIds = languages.map((language) => language.id);
    const visibleList = allIds.filter((id) => visibleIds.has(id));
    const hiddenList = allIds.filter((id) => !visibleIds.has(id));

    if (hiddenList.length === 0) {
      return { mode: 'all', ids: [] };
    }

    if (visibleList.length <= hiddenList.length) {
      return { mode: 'only', ids: visibleList };
    }

    return { mode: 'except', ids: hiddenList };
  }

  function isLanguageVisible(languageId: string): boolean {
    return getVisibleIds(value).has(languageId);
  }

  function toggleLanguage(languageId: string) {
    const visibleIds = getVisibleIds(value);
    if (visibleIds.has(languageId)) {
      visibleIds.delete(languageId);
    } else {
      visibleIds.add(languageId);
    }
    onChange(normalizeFromVisibleIds(visibleIds));
  }

  function setAllVisible() {
    onChange({ mode: 'all', ids: [] });
  }

  function setNoneVisible() {
    onChange({ mode: 'only', ids: [] });
  }

  function setOnlyOriginalKcmVisible() {
    const availableKcmIds = ORIGINAL_KCM_LANGUAGE_IDS.filter((id) =>
      languages.some((language) => language.id === id)
    );
    onChange({ mode: 'only', ids: availableKcmIds });
  }

  function resetPicker() {
    search = '';
    onChange({ mode: 'all', ids: [] });
  }

  function getClassificationIds(classification: LanguageClassification): string[] {
    return languages
      .filter((language) => (language.classification ?? 'plain') === classification)
      .map((language) => language.id);
  }

  function getClassificationButtonLabel(classification: Exclude<LanguageClassification, 'plain'>): string {
    const ids = getClassificationIds(classification);
    if (ids.length === 0) {
      return classification === 'family' ? 'Families' : 'Unions';
    }

    const visibleIds = getVisibleIds(value);
    const allVisible = ids.every((id) => visibleIds.has(id));
    return `${allVisible ? 'Hide' : 'Show'} ${classification === 'family' ? 'families' : 'unions'}`;
  }

  function toggleClassification(classification: Exclude<LanguageClassification, 'plain'>) {
    const ids = getClassificationIds(classification);
    if (ids.length === 0) return;

    const visibleIds = getVisibleIds(value);
    const allVisible = ids.every((id) => visibleIds.has(id));
    const nextVisibleIds = new Set(visibleIds);

    if (allVisible) {
      for (const id of ids) nextVisibleIds.delete(id);
    } else {
      for (const id of ids) nextVisibleIds.add(id);
    }

    onChange(normalizeFromVisibleIds(nextVisibleIds));
  }

  const visibleCount = $derived(getVisibleIds(value).size);
</script>

<div class="picker-shell">
  <div class="picker-toolbar">
    <div class="classification-actions">
      <button type="button" class="toolbar-btn" onclick={() => toggleClassification('family')}>
        {getClassificationButtonLabel('family')}
      </button>
      <button type="button" class="toolbar-btn" onclick={() => toggleClassification('union')}>
        {getClassificationButtonLabel('union')}
      </button>
      <button type="button" class="toolbar-btn" onclick={setOnlyOriginalKcmVisible}>Only KCM</button>
      <button type="button" class="toolbar-btn" onclick={setAllVisible}>Show all</button>
      <button type="button" class="toolbar-btn" onclick={setNoneVisible}>Hide all</button>
      <button type="button" class="toolbar-btn subtle" onclick={resetPicker}>Reset</button>
    </div>
  </div>

  <input
    type="search"
    bind:value={search}
    class="search-input"
    placeholder="Search languages"
    aria-label="Search languages"
  />

  <div class="picker-summary">
    <span>{visibleCount} of {languages.length} visible</span>
    <span class="summary-mode">{value.mode === 'all' ? 'all visible' : value.mode === 'only' ? 'only selected' : 'hide selected'}</span>
  </div>

  <div class="picker-list" role="list">
    {#each filteredLanguages as language (language.id)}
      <label class="picker-item">
        <input
          type="checkbox"
          checked={isLanguageVisible(language.id)}
          onchange={() => toggleLanguage(language.id)}
        />
        <div class="item-copy">
          <MathText text={language.name} className="item-name" />
          <div class="item-meta">{language.fullName}</div>
        </div>
      </label>
    {/each}

    {#if filteredLanguages.length === 0}
      <div class="empty-state">No languages match this search.</div>
    {/if}
  </div>
</div>

<style>
  .picker-shell {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .picker-toolbar {
    display: flex;
    align-items: center;
  }

  .classification-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    width: 100%;
  }

  .search-input {
    width: 100%;
    padding: 0.42rem 0.65rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.6rem;
    font-size: 0.82rem;
    background: #fff;
  }

  .toolbar-btn {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    border-radius: 999px;
    padding: 0.24rem 0.52rem;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .toolbar-btn.subtle {
    color: #475569;
  }

  .picker-summary {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: #475569;
  }

  .summary-mode {
    text-transform: capitalize;
  }

  .picker-list {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    max-height: 11rem;
    overflow-y: auto;
    padding-right: 0.15rem;
  }

  .picker-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.45rem;
    align-items: center;
    padding: 0.32rem 0.52rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.6rem;
    background: #fff;
  }

  .picker-item input {
    margin: 0;
  }

  .item-copy {
    min-width: 0;
  }

  :global(.item-name) {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.84rem;
  }

  .item-meta {
    margin-top: 0.05rem;
    font-size: 0.69rem;
    color: #64748b;
    line-height: 1.2;
  }

  .empty-state {
    padding: 0.55rem;
    border: 1px dashed #cbd5e1;
    border-radius: 0.75rem;
    color: #64748b;
    font-size: 0.74rem;
    text-align: center;
  }

  @media (max-width: 960px) {
    .picker-toolbar {
      align-items: stretch;
    }

    .classification-actions {
      width: 100%;
    }
  }
</style>
