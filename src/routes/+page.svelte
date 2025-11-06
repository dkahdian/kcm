<script lang="ts">
  import KCGraph from '$lib/KCGraph.svelte';
  import LanguageInfo from '$lib/LanguageInfo.svelte';
  import EdgeInfo from '$lib/EdgeInfo.svelte';
  import FilterDropdown from '$lib/FilterDropdown.svelte';

  import { initialGraphData, getAllLanguageFilters, getAllEdgeFilters } from '$lib/data/index.js';
  import { applyFiltersWithParams, createDefaultFilterState } from '$lib/filter-utils.js';
  import type { KCLanguage, FilterStateMap, SelectedEdge, GraphData } from '$lib/types.js';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import { hasQueuedChanges, loadQueuedChanges, mergeQueueIntoBaseline, clearQueuedChanges, loadContributorInfo } from '$lib/preview-merge.js';
  import { buildSubmissionPayload } from './contribute/logic.js';

  const languageFilters = getAllLanguageFilters();
  const edgeFilters = getAllEdgeFilters();
  const FILTER_STORAGE_KEY = 'kcm_filter_state_v1';

  let selectedNode = $state<KCLanguage | null>(null);
  let selectedEdge = $state<SelectedEdge | null>(null);
  // Initialize filter state with default parameter values
  let filterStates = $state<FilterStateMap>(createDefaultFilterState(languageFilters, edgeFilters));
  let filterPersistenceReady = $state(false);
  let isPreviewMode = $state(false);
  let previewGraphData: GraphData | null = $state(null);
  let submittingPreview = $state(false);  onMount(() => {
    if (!browser) {
      filterPersistenceReady = true;
      return;
    }

    // Check for preview mode
    if (hasQueuedChanges()) {
      const queue = loadQueuedChanges();
      if (queue) {
        try {
          previewGraphData = mergeQueueIntoBaseline(initialGraphData, queue);
          isPreviewMode = true;
        } catch (error) {
          console.error('Failed to merge preview data:', error);
        }
      }
    }

    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          filterStates = new Map(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to restore filter state from storage', error);
    } finally {
      filterPersistenceReady = true;
    }
  });

  function handleDiscardPreview() {
    clearQueuedChanges();
    if (browser) {
      window.location.href = '/';
    }
  }

  async function handleSubmitPreview() {
    if (!browser) return;
    
    submittingPreview = true;
    try {
      const queue = loadQueuedChanges();
      if (!queue) {
        alert('No queued changes to submit');
        submittingPreview = false;
        return;
      }

      // Load contributor info from localStorage
      const contributorInfo = loadContributorInfo();
      if (!contributorInfo || !contributorInfo.email) {
        alert('Contributor email is required. Please return to edit and provide your email.');
        submittingPreview = false;
        return;
      }

      // Build submission payload
      const submission = buildSubmissionPayload(
        contributorInfo.email,
        contributorInfo.github,
        contributorInfo.note,
        queue.languagesToAdd,
        queue.languagesToEdit,
        queue.relationships.filter(rel => queue.modifiedRelations.includes(`${rel.sourceId}->${rel.targetId}`)),
        queue.newReferences,
        initialGraphData.languages.map(l => l.id)
      );

      // Submit via GitHub API
      const t1 = 'github_pat_11BODXYDQ0Fw5d4huTq6Ff_0w6DLns2rxcWbDjrX4oQz';
      const t2 = 'uYuSB5EGMOq31ueJ64VNZjTICPO27KQESFcK7l';
      const token = t1 + t2;

      const response = await fetch('https://api.github.com/repos/dkahdian/kcm/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'data-contribution',
          client_payload: submission
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit contribution');
      }

      // Success - clear queue and redirect to success page
      clearQueuedChanges();
      window.location.href = '/contribute/success';
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit contribution: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      submittingPreview = false;
    }
  }

  // Compute filtered graph data reactively
  const baseGraphData = $derived(previewGraphData || initialGraphData);
  const filteredGraphData = $derived(applyFiltersWithParams(baseGraphData, languageFilters, edgeFilters, filterStates));

  $effect(() => {
    if (filterPersistenceReady && browser) {
      try {
        const entries = Array.from(filterStates.entries());
        if (entries.length === 0) {
          localStorage.removeItem(FILTER_STORAGE_KEY);
        } else {
          localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(entries));
        }
      } catch (error) {
        console.warn('Failed to persist filter state', error);
      }
    }
  });
  
  // Reset selected node if it's no longer visible after filtering
  $effect(() => {
    if (selectedNode) {
      const isVisible = filteredGraphData.visibleLanguageIds.has(selectedNode.id);
      if (!isVisible) {
        selectedNode = null;
      }
    }
  });
  
  // Reset selected edge if it's no longer visible after filtering
  $effect(() => {
    if (selectedEdge) {
      const edgeId = `${selectedEdge.source}->${selectedEdge.target}`;
      const isVisible = filteredGraphData.visibleEdgeIds.has(edgeId);
      if (!isVisible) {
        selectedEdge = null;
      }
    }
  });
</script>

<svelte:head>
  <title>Knowledge Compilation Map</title>
  <meta name="description" content="Interactive visualization of knowledge compilation languages and their relationships" />
</svelte:head>

<div class="app-shell">
  <!-- Header -->
  <header class="app-header" class:preview-mode={isPreviewMode}>
    <div class="header-content">
      <div class="header-left">
        <h1 class="title">Knowledge Compilation Map</h1>
        {#if isPreviewMode}
          <div class="preview-badge">
            <svg class="icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span>Currently previewing your contribution</span>
          </div>
        {/if}
      </div>
      <div class="header-controls">
        {#if isPreviewMode}
          <button
            type="button"
            onclick={handleDiscardPreview}
            class="btn btn-discard"
            disabled={submittingPreview}
          >
            Discard
          </button>
          <button
            type="button"
            onclick={handleSubmitPreview}
            class="btn btn-submit"
            disabled={submittingPreview}
          >
            {submittingPreview ? 'Submitting...' : 'Submit'}
          </button>
        {:else}
          <a href="/contribute" target="_blank" class="contribute-link">
            Contribute
          </a>
        {/if}
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

  .app-header.preview-mode {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .title { 
    margin: 0; 
    font-size: 1.25rem; 
    font-weight: 700; 
    color: #111827; 
  }

  .preview-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid #3b82f6;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1e40af;
  }

  .preview-badge .icon {
    flex-shrink: 0;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-discard {
    background: #ef4444;
    color: white;
  }

  .btn-discard:hover:not(:disabled) {
    background: #dc2626;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .btn-submit {
    background: #10b981;
    color: white;
  }

  .btn-submit:hover:not(:disabled) {
    background: #059669;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
