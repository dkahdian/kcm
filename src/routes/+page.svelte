<script lang="ts">
  import KCGraph from '$lib/KCGraph.svelte';
  import LanguageInfo from '$lib/LanguageInfo.svelte';
  import EdgeInfo from '$lib/EdgeInfo.svelte';
  import FilterDropdown from '$lib/FilterDropdown.svelte';
  import { initialGraphData, getAllLanguageFilters, getAllEdgeFilters } from '$lib/data/index.js';
  import { applyFiltersWithParams, createDefaultFilterState } from '$lib/filter-utils.js';
  import type { KCLanguage, FilterStateMap, SelectedEdge } from '$lib/types.js';
  
  const languageFilters = getAllLanguageFilters();
  const edgeFilters = getAllEdgeFilters();
  
  let selectedNode: KCLanguage | null = null;
  let selectedEdge: SelectedEdge | null = null;
  // Initialize filter state with default parameter values
  let filterStates: FilterStateMap = createDefaultFilterState(languageFilters, edgeFilters);
  
  // Compute filtered graph data reactively
  $: filteredGraphData = applyFiltersWithParams(initialGraphData, languageFilters, edgeFilters, filterStates);
  
  // Reset selected node if it's no longer visible after filtering
  $: if (selectedNode) {
    const isVisible = filteredGraphData.visibleLanguageIds.has(selectedNode.id);
    if (!isVisible) {
      selectedNode = null;
    }
  }
  
  // Reset selected edge if it's no longer visible after filtering
  $: if (selectedEdge) {
    const edgeId = `${selectedEdge.source}->${selectedEdge.target}`;
    const isVisible = filteredGraphData.visibleEdgeIds.has(edgeId);
    if (!isVisible) {
      selectedEdge = null;
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
        <a href="/contribute" target="_blank" class="contribute-link">
          Contribute
        </a>
        <FilterDropdown 
          languageFilters={languageFilters}
          edgeFilters={edgeFilters}
          bind:filterStates 
          class="filter-control"
        />
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="app-main">
    <section class="graph-panel">
      <KCGraph graphData={filteredGraphData} bind:selectedNode bind:selectedEdge />
    </section>

    <aside class="side-panel">
      {#if selectedEdge}
        <EdgeInfo selectedEdge={selectedEdge} graphData={filteredGraphData} />
      {:else}
        <LanguageInfo 
          selectedLanguage={selectedNode} 
          graphData={filteredGraphData} 
          onEdgeSelect={(edge) => { selectedEdge = edge; }}
        />
      {/if}
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

  .contribute-link {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .contribute-link:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .contribute-link:active {
    transform: translateY(0);
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
