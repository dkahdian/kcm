<script lang="ts">
  import KCGraph from '$lib/KCGraph.svelte';
  import LanguageInfo from '$lib/LanguageInfo.svelte';
  import FilterDropdown from '$lib/FilterDropdown.svelte';
  import { initialGraphData, getAllFilters } from '$lib/data/index.js';
  import { applyFilters } from '$lib/filter-utils.js';
  import type { KCLanguage, LanguageFilter } from '$lib/types.js';
  
  const allFilters = getAllFilters();
  
  let selectedNode: KCLanguage | null = null;
  // Initialize with filters that are active by default
  let selectedFilters: LanguageFilter[] = allFilters.filter(f => f.activeByDefault);
  
  // Compute filtered graph data reactively
  $: filteredGraphData = applyFilters(initialGraphData, selectedFilters);
  
  // Reset selected node if it's no longer visible after filtering
  $: if (selectedNode && selectedFilters.length > 0) {
    const isVisible = filteredGraphData.visibleLanguageIds.has(selectedNode.id);
    if (!isVisible) {
      selectedNode = null;
    }
  }
</script>

<svelte:head>
  <title>Knowledge Compilation Map</title>
  <meta name="description" content="Interactive visualization of knowledge compilation languages and their relationships" />
</svelte:head>

<div class="app-shell">
  <!-- Header -->
  <header class="app-header">
    <div class="header-content">
      <h1 class="title">Knowledge Compilation Map</h1>
      <div class="header-controls">
        <FilterDropdown 
          filters={allFilters} 
          bind:selectedFilters 
          class="filter-control"
        />
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="app-main">
    <section class="graph-panel">
      <KCGraph graphData={filteredGraphData} bind:selectedNode />
    </section>

    <aside class="side-panel">
      <LanguageInfo selectedLanguage={selectedNode} graphData={initialGraphData} />
    </aside>
  </main>
</div>

<style>
  :global(html, body) { height: 100%; margin: 0; }
  :global(body) { overflow: hidden; background: #f9fafb; }

  .app-shell {
    height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .app-header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .title { 
    margin: 0; 
    font-size: 1.25rem; 
    font-weight: 700; 
    color: #111827; 
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .app-main {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.75rem;
    padding: 0.75rem;
    height: 100%;
    min-height: 0; /* allow children to shrink */
  }

  .graph-panel {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
  }
  
  .side-panel {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .side-panel > :global(.content-wrapper) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0.75rem;
  }
  
  .side-panel > :global(.scrollable-content) {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  
  .side-panel > :global(.fixed-legend) {
    flex-shrink: 0;
  }

  /* Ensure KCGraph fills container */
  :global(.kcm-graph-container) { flex: 1 1 auto; min-height: 0; }
</style>
