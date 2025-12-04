<script lang="ts">
  import MathText from './components/MathText.svelte';
  import type { SelectedEdge, TransformationStatus, GraphData, FilteredGraphData, KCReference } from './types.js';
  import DynamicLegend from './components/DynamicLegend.svelte';
  
  let { selectedEdge, graphData }: { 
    selectedEdge: SelectedEdge | null; 
    graphData: GraphData | FilteredGraphData 
  } = $props();
  
  let referencesSection: HTMLElement | null = $state(null);
  let copiedRefId: string | null = $state(null);

  // Look up the original (unfiltered) edge data from graphData's adjacency matrix
  const originalEdge = $derived.by(() => {
    if (!selectedEdge) return null;
    
    const { adjacencyMatrix } = graphData;
    const sourceIdx = adjacencyMatrix.indexByLanguage[selectedEdge.source];
    const targetIdx = adjacencyMatrix.indexByLanguage[selectedEdge.target];
    
    if (sourceIdx === undefined || targetIdx === undefined) return selectedEdge;
    
    const forwardRelation = adjacencyMatrix.matrix[sourceIdx][targetIdx];
    const backwardRelation = adjacencyMatrix.matrix[targetIdx][sourceIdx];
    
    return {
      ...selectedEdge,
      forward: forwardRelation,
      backward: backwardRelation
    };
  });

  // Collect all unique references from both directions
  const edgeReferences = $derived.by<KCReference[]>(() => {
    if (!originalEdge) return [];

    const refIds = new Set<string>();
    const refs: KCReference[] = [];

    const collectRefs = (relation: typeof originalEdge.forward) => {
      if (!relation) return;
      relation.refs.forEach((id) => refIds.add(id));
      relation.separatingFunctions?.forEach((fn) => {
        fn.refs.forEach((id) => refIds.add(id));
      });
    };

    collectRefs(originalEdge.forward);
    collectRefs(originalEdge.backward);

    const referenceMap = new Map(graphData.references.map((ref) => [ref.id, ref]));
    for (const id of refIds) {
      const ref = referenceMap.get(id);
      if (ref) {
        refs.push(ref);
      }
    }

    return refs;
  });

  function getStatusLabel(status: TransformationStatus): string {
    switch (status) {
      case 'poly':
        return 'Polynomial time';
      case 'no-quasi':
        return 'No quasipolynomial transformation';
      case 'no-poly-quasi':
        return 'Quasi-polynomial only (no polynomial)';
      case 'no-poly-unknown-quasi':
        return 'No polynomial; quasi-polynomial unknown';
      case 'unknown-poly-quasi':
        return 'Quasi-polynomial exists; polynomial unknown';
      case 'unknown-both':
        return 'Complexity unknown';
      case 'not-poly':
        return 'No polynomial transformation';
      default:
        return 'Unknown';
    }
  }

  function getRefNumber(refId: string): number {
    const idx = edgeReferences.findIndex(ref => ref.id === refId);
    return idx >= 0 ? idx + 1 : 0;
  }

  function scrollToReferences(e: MouseEvent) {
    e.preventDefault();
    referencesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function copyBibtex(bibtex: string, refId: string) {
    try {
      await navigator.clipboard.writeText(bibtex);
      copiedRefId = refId;
      setTimeout(() => {
        copiedRefId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy BibTeX:', err);
    }
  }
</script>

{#if selectedEdge}
  <div class="content-wrapper">
    <div class="scrollable-content">
      <div class="edge-details">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          <MathText text={selectedEdge.sourceName} className="inline" />
          <span> ↔ </span>
          <MathText text={selectedEdge.targetName} className="inline" />
        </h3>
        
        <div class="space-y-4">
          {#if originalEdge && originalEdge.forward}
            <div class="direction-block">
              <h5 class="font-semibold text-gray-900 mb-2">
                <MathText text={selectedEdge.sourceName} className="inline" />
                <span> → </span>
                <MathText text={selectedEdge.targetName} className="inline" />
              </h5>
              <p class="text-sm text-gray-700 mb-2">
                {getStatusLabel(originalEdge.forward.status)}{#if originalEdge.forward.refs.length}{#each originalEdge.forward.refs as refId}<button 
                      class="ref-badge"
                      onclick={scrollToReferences}
                      title="View reference"
                    >[{getRefNumber(refId)}]</button>{/each}{/if}
              </p>
              {#if originalEdge.forward.description}
                <MathText text={originalEdge.forward.description} className="text-sm text-gray-600 mb-2 italic block" />
              {/if}
              
              {#if originalEdge.forward.separatingFunctions && originalEdge.forward.separatingFunctions.length > 0}
                <div class="mt-3">
                  <h6 class="text-sm font-semibold text-gray-900 mb-2">Separating Functions</h6>
                  <div class="space-y-2">
                    {#each originalEdge.forward.separatingFunctions as fn}
                      <div class="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div class="font-medium text-sm text-gray-900">
                          <MathText text={fn.name} className="inline" />{#if fn.refs.length}{#each fn.refs as refId}<button 
                                class="ref-badge"
                                onclick={scrollToReferences}
                                title="View reference"
                              >[{getRefNumber(refId)}]</button>{/each}{/if}
                        </div>
                        <MathText text={fn.description} className="text-xs text-gray-600 mt-1 block" />
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
          
          {#if originalEdge && originalEdge.backward}
            <div class="direction-block">
              <h5 class="font-semibold text-gray-900 mb-2">
                <MathText text={selectedEdge.targetName} className="inline" />
                <span> → </span>
                <MathText text={selectedEdge.sourceName} className="inline" />
              </h5>
              <p class="text-sm text-gray-700 mb-2">
                {getStatusLabel(originalEdge.backward.status)}{#if originalEdge.backward.refs.length}{#each originalEdge.backward.refs as refId}<button 
                      class="ref-badge"
                      onclick={scrollToReferences}
                      title="View reference"
                    >[{getRefNumber(refId)}]</button>{/each}{/if}
              </p>
              {#if originalEdge.backward.description}
                <MathText text={originalEdge.backward.description} className="text-sm text-gray-600 mb-2 italic block" />
              {/if}
              
              {#if originalEdge.backward.separatingFunctions && originalEdge.backward.separatingFunctions.length > 0}
                <div class="mt-3">
                  <h6 class="text-sm font-semibold text-gray-900 mb-2">Separating Functions</h6>
                  <div class="space-y-2">
                    {#each originalEdge.backward.separatingFunctions as fn}
                      <div class="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div class="font-medium text-sm text-gray-900">
                          <MathText text={fn.name} className="inline" />{#if fn.refs.length}{#each fn.refs as refId}<button 
                                class="ref-badge"
                                onclick={scrollToReferences}
                                title="View reference"
                              >[{getRefNumber(refId)}]</button>{/each}{/if}
                        </div>
                        <MathText text={fn.description} className="text-xs text-gray-600 mt-1 block" />
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-200" bind:this={referencesSection}>
          {#if edgeReferences.length > 0}
            <div class="mb-2">
              <h6 class="text-sm font-semibold text-gray-900 mb-2">References</h6>
              <ol class="space-y-2">
                {#each edgeReferences as ref, idx}
                  <li class="text-xs text-gray-700">
                    <div class="flex items-start gap-1.5">
                      <span class="font-semibold text-gray-900">[{idx + 1}]</span>
                      <div class="flex-1 min-w-0">
                        <a class="underline text-blue-600 hover:text-blue-800 break-words" href={ref.href} target="_blank" rel="noreferrer noopener">{ref.title}</a>
                        <button
                          class="font-medium cursor-pointer ml-2 transition-colors"
                          class:text-green-600={copiedRefId !== ref.id}
                          class:hover:text-green-800={copiedRefId !== ref.id}
                          class:text-green-700={copiedRefId === ref.id}
                          onclick={() => copyBibtex(ref.bibtex, ref.id)}
                          title="Copy BibTeX citation"
                        >
                          {copiedRefId === ref.id ? '[✓ copied]' : '[copy bibtex]'}
                        </button>
                      </div>
                    </div>
                  </li>
                {/each}
              </ol>
            </div>
          {/if}
        </div>
      </div>
      
      <DynamicLegend graphData={graphData} selectedEdge={selectedEdge} />
    </div>
  </div>
{/if}

<style>
  .content-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  
  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-bottom: 1rem;
  }
  
  .edge-details {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .direction-block {
    padding: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .ref-badge {
    display: inline;
    font-size: 0.7em;
    vertical-align: super;
    line-height: 0;
    color: #2563eb;
    background: none;
    border: none;
    padding: 0;
    margin: 0 0.1em;
    cursor: pointer;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .ref-badge:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }
</style>
