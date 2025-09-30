<script lang="ts">
  import type { LanguageFilter, FilterCategory } from './types.js';
  import { organizeFiltersByCategory } from './data.js';

  function getDisplayText(): string {
    if (selectedFilters.length === 0) {
      return 'No Filters';
    }
    
    if (selectedFilters.length === 1) {
      return selectedFilters[0].name;
    }
    
    return `${selectedFilters.length} filters active`;
  }

  let { 
    filters, 
    selectedFilters = $bindable(), 
    class: className = '' 
  }: {
    filters: LanguageFilter[];
    selectedFilters: LanguageFilter[];
    class?: string;
  } = $props();
  
  // Organize filters by category
  const categories = $derived(organizeFiltersByCategory(filters));

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement;

  function resetAllFilters() {
    selectedFilters = [];
  }

  function toggleFilter(filter: LanguageFilter) {
    // Special handling for "Reset Filters" - clear all filters
    if (filter.id === 'all') {
      resetAllFilters();
      return;
    }

    const existingIndex = selectedFilters.findIndex(f => f.id === filter.id);
    if (existingIndex >= 0) {
      // Remove if already selected
      const newFilters = [...selectedFilters];
      newFilters.splice(existingIndex, 1);
      selectedFilters = newFilters;
    } else {
      // Add if not selected
      selectedFilters = [...selectedFilters, filter];
    }
  }

  function isFilterSelected(filter: LanguageFilter): boolean {
    return selectedFilters.some(f => f.id === filter.id);
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
          title="Clear all active filters"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="reset-icon">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
          <span class="reset-text">Reset Filters</span>
        </button>
      </div>

      <!-- Categories -->
      {#each categories as category}
        <div class="category-section">
          <h3 class="category-title">{category.name}</h3>
          <div class="category-filters">
            {#each category.filters as filter}
              <label
                class="dropdown-item"
                class:selected={isFilterSelected(filter)}
                title={filter.description}
              >
                <input
                  type="checkbox"
                  checked={isFilterSelected(filter)}
                  onchange={() => toggleFilter(filter)}
                  class="filter-checkbox"
                />
                <span class="item-name">{filter.name}</span>
                {#if isFilterSelected(filter)}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="check-icon">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                {/if}
              </label>
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