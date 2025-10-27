<script lang="ts">
  import type { LanguageFilter, EdgeFilter, FilterCategory, FilterStateMap } from './types.js';
  import { organizeFiltersByCategory } from './data/index.js';
  import { createDefaultFilterState } from './filter-utils.js';

  type AnyFilter = LanguageFilter | EdgeFilter;

  function getDisplayText(): string {
    const activeCount = countActiveFilters();
    
    if (activeCount === 0) {
      return 'No Active Filters';
    }
    
    return `${activeCount} filter${activeCount > 1? 's' : ''} active`;
  }
  
  function countActiveFilters(): number {
    return visibleFilters.filter(f => {
      const param = getFilterValue(f);
      return isFilterActive(f, param);
    }).length;
  }
  
  function isFilterActive(filter: AnyFilter, param: any): boolean {
    // For boolean parameters, true means active
    if (typeof param === 'boolean') {
      return param !== filter.defaultParam;
    }
    // For other types, any non-default value means active
    return param !== filter.defaultParam;
  }

  function getFilterValue(filter: AnyFilter): any {
    return filterStates.get(filter.id) ?? filter.defaultParam;
  }

  function setFilterValue(filter: AnyFilter, value: any) {
    const newStates = new Map(filterStates);
    newStates.set(filter.id, value);
    filterStates = newStates;
  }

  let { 
    languageFilters = [], 
    edgeFilters = [],
    filterStates = $bindable(), 
    class: className = '' 
  }: {
    languageFilters?: LanguageFilter[];
    edgeFilters?: EdgeFilter[];
    filterStates: FilterStateMap;
    class?: string;
  } = $props();
  
  // Combine all filters for UI display
  const allFilters = $derived([...languageFilters, ...edgeFilters]);
  
  // Filter out hidden filters from UI
  const visibleFilters = $derived(allFilters.filter(f => !f.hidden));
  
  // Organize filters by category
  const categories = $derived(organizeFiltersByCategory(visibleFilters as LanguageFilter[]));

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement;

  function resetAllFilters() {
    // Reset all filters to their default parameters
    filterStates = createDefaultFilterState(languageFilters, edgeFilters);
  }

  function toggleFilter(filter: AnyFilter) {
    const currentParam = getFilterValue(filter);
    
    // For boolean filters, toggle the value
    if (typeof currentParam === 'boolean') {
      setFilterValue(filter, !currentParam);
    }
  }

  function isFilterChecked(filter: AnyFilter): boolean {
    const param = getFilterValue(filter);
    // For boolean params, checked means true
    return param === true;
  }



  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="filter-dropdown {className}" bind:this={dropdownRef}>
  <button 
    class="dropdown-button"
    onclick={() => isOpen = !isOpen}
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    <span class="selected-text">
      {getDisplayText()}
    </span>
    <svg 
      class="chevron" 
      class:rotated={isOpen}
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="currentColor"
    >
      <path d="M4.427 6.573L8 10.146l3.573-3.573a.5.5 0 1 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 1 1 .708-.708z"/>
    </svg>
  </button>

  {#if isOpen}
    <div class="dropdown-menu">
      <!-- Reset Filters Button -->
      <div class="reset-section">
        <button
          class="reset-button"
          onclick={resetAllFilters}
          title="Reset filters to default state"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="reset-icon">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          <span class="reset-text">Reset to Defaults</span>
        </button>
      </div>

      <!-- Categories -->
      {#each categories as category}
        <div class="category-section">
          <h3 class="category-title">{category.name}</h3>
          <div class="category-filters">
            {#each category.filters as filter}
              {@const value = getFilterValue(filter)}
              {#if filter.controlType === 'dropdown' && filter.options}
                <div
                  class="dropdown-item dropdown-select"
                  class:selected={isFilterActive(filter, value)}
                  title={filter.description}
                >
                  <span class="item-name">{filter.name}</span>
                  <select
                    class="filter-select"
                    value={value as string}
                    onchange={(event) => setFilterValue(filter, (event.target as HTMLSelectElement).value)}
                  >
                    {#each filter.options as option}
                      <option value={option.value} title={option.description}>
                        {option.label}
                      </option>
                    {/each}
                  </select>
                </div>
              {:else}
                <label
                  class="dropdown-item"
                  class:selected={isFilterChecked(filter)}
                  title={filter.description}
                >
                  <input
                    type="checkbox"
                    checked={isFilterChecked(filter)}
                    onchange={() => toggleFilter(filter)}
                    class="filter-checkbox"
                  />
                  <span class="item-name">{filter.name}</span>
                </label>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .filter-dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    min-width: 160px;
    transition: all 0.15s ease;
  }

  .dropdown-button:hover {
    border-color: #9ca3af;
    background-color: #f9fafb;
  }

  .dropdown-button:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .selected-text {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chevron {
    color: #6b7280;
    transition: transform 0.15s ease;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 50;
    width: 660px; /* 3x wider than original ~220px */
    margin-top: 0.25rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: #374151;
    cursor: pointer;
    transition: background-color 0.15s ease;
    border-right: 1px solid #f3f4f6;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.875rem;
  }



  .filter-checkbox {
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
  }

  .dropdown-select {
    align-items: center;
    gap: 0.75rem;
  }

  .filter-select {
    min-width: 140px;
    padding: 0.35rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background-color: white;
    font-size: 0.875rem;
    color: #374151;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }



  .dropdown-item:hover {
    background-color: #f9fafb;
  }

  .dropdown-item.selected {
    background-color: #eff6ff;
    color: #1d4ed8;
  }

  .item-name {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .check-icon {
    color: #10b981;
  }

  .reset-section {
    padding: 0 0.5rem 0.5rem 0.5rem;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 0.75rem;
  }

  .reset-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    background-color: #ef4444;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.15s ease;
  }

  .reset-button:hover {
    background-color: #dc2626;
  }

  .reset-button:active {
    background-color: #b91c1c;
  }

  .reset-icon {
    width: 16px;
    height: 16px;
  }

  .reset-text {
    font-weight: 500;
  }

  .category-section {
    margin-bottom: 1rem;
    padding: 0 0.5rem;
  }

  .category-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin: 0 0 0.5rem 0;
    padding: 0 0.25rem;
    text-transform: capitalize;
  }

  .category-filters {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }

  .category-filters .dropdown-item:nth-child(3n) {
    border-right: none; /* Remove right border on last column */
  }
</style>