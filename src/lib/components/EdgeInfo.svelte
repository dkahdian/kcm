<script lang="ts">
  import MathText from './MathText.svelte';
  import type { SelectedEdge, GraphData, FilteredGraphData, KCReference, KCSeparatingFunction, DirectedSuccinctnessRelation, ViewMode } from '$lib/types.js';
  import { getComplexityFromCatalog } from '$lib/data/complexities.js';
  import { extractCitationKeys } from '$lib/utils/math-text.js';
  import { getGlobalRefNumber } from '$lib/data/references.js';
  import DynamicLegend from './DynamicLegend.svelte';
  import ReferenceList from './ReferenceList.svelte';
  
  let { selectedEdge, graphData, filteredGraphData, viewMode = 'graph' as ViewMode }: { 
    selectedEdge: SelectedEdge | null; 
    graphData: GraphData | FilteredGraphData;
    filteredGraphData?: GraphData | FilteredGraphData;
    viewMode?: ViewMode;
  } = $props();

  // Use filteredGraphData for the legend if provided, otherwise fall back to graphData
  const legendGraphData = $derived(filteredGraphData ?? graphData);
  
  let referencesSection: HTMLElement | null = $state(null);

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

  // Create a map for looking up separating functions by shortName
  const separatingFunctionMap = $derived.by(() => {
    const map = new Map<string, (typeof graphData.separatingFunctions)[number]>();
    for (const sf of graphData.separatingFunctions) {
      map.set(sf.shortName, sf);
    }
    return map;
  });

  // Look up separating functions for a relation by IDs
  function getSeparatingFunctionsForRelation(relation: { separatingFunctionIds?: string[] } | null) {
    if (!relation?.separatingFunctionIds?.length) return [];
    return relation.separatingFunctionIds
      .map(id => separatingFunctionMap.get(id))
      .filter((sf): sf is NonNullable<typeof sf> => sf !== undefined);
  }

  // Pre-compute separating functions for both directions
  const forwardSeparatingFunctions = $derived(
    originalEdge?.forward ? getSeparatingFunctionsForRelation(originalEdge.forward) : []
  );

  const backwardSeparatingFunctions = $derived(
    originalEdge?.backward ? getSeparatingFunctionsForRelation(originalEdge.backward) : []
  );

  // Collect all unique references from both directions, including inline citations
  const edgeReferences = $derived.by<KCReference[]>(() => {
    if (!originalEdge) return [];

    const refIds = new Set<string>();
    const refs: KCReference[] = [];

    const collectRefs = (relation: { refs: string[]; description?: string; separatingFunctionIds?: string[] } | null) => {
      if (!relation) return;
      relation.refs.forEach((id) => refIds.add(id));
      
      // Extract citation keys from description
      if (relation.description) {
        extractCitationKeys(relation.description).forEach((key) => refIds.add(key));
      }
      
      // Look up separating functions by ID and collect their refs and inline citations
      getSeparatingFunctionsForRelation(relation).forEach((fn) => {
        fn.refs.forEach((id) => refIds.add(id));
        // Also extract citations from separating function description
        if (fn.description) {
          extractCitationKeys(fn.description).forEach((key) => refIds.add(key));
        }
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

    // Sort by global reference number
    refs.sort((a, b) => (getGlobalRefNumber(a.id) ?? Infinity) - (getGlobalRefNumber(b.id) ?? Infinity));

    return refs;
  });

  function getStatusLabel(status: string): string {
    const complexity = getComplexityFromCatalog(graphData.complexities, status);
    return complexity.description;
  }

  function scrollToReferences(e: MouseEvent) {
    e.preventDefault();
    referencesSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Handler for inline citation clicks (receives key string, not MouseEvent)
  function handleCitationClick(_key: string) {
    referencesSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
{#snippet directionBlock(fromName: string, toName: string, relation: DirectedSuccinctnessRelation, separatingFns: KCSeparatingFunction[])}
            <div class="direction-block">
              <h5 class="font-semibold text-gray-900 mb-2">
                <MathText text={fromName} className="inline" />
                <span> → </span>
                <MathText text={toName} className="inline" />
              </h5>
              <p class="text-sm text-gray-700 mb-2">
                {getStatusLabel(relation.status)}{#if relation.caveat}{' '}unless {relation.caveat}{/if}{#if relation.refs.length}{' '}{#each relation.refs as refId}<button 
                      class="ref-badge"
                      onclick={scrollToReferences}
                      title="View reference"
                    >[{getGlobalRefNumber(refId) ?? '?'}]</button>{/each}{/if}
              </p>
              {#if relation.description}
                <MathText 
                  text={relation.description} 
                  className="text-sm text-gray-600 mb-2 italic block" 
                  onCitationClick={handleCitationClick}
                />
              {/if}

              {#if relation.derived}
                <div class="derived-notice mt-2 mb-2">
                  <span class="derived-badge">Derived</span>
                  <span class="text-xs text-gray-500">This was inferred from other data</span>
                </div>
              {/if}
              
              {#if separatingFns.length > 0}
                <div class="mt-3">
                  <h6 class="text-sm font-semibold text-gray-900 mb-2">Separating Functions</h6>
                  <div class="space-y-2">
                    {#each separatingFns as fn}
                      <div class="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div class="font-medium text-sm text-gray-900">
                          <MathText text={fn.name} className="inline" />{#if fn.refs.length}{#each fn.refs as refId}<button 
                                class="ref-badge"
                                onclick={scrollToReferences}
                                title="View reference"
                              >[{getGlobalRefNumber(refId) ?? '?'}]</button>{/each}{/if}
                        </div>
                        <MathText 
                          text={fn.description} 
                          className="text-xs text-gray-600 mt-1 block"
                          onCitationClick={handleCitationClick}
                        />
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/snippet}

          {#if originalEdge?.forward}
            {@render directionBlock(selectedEdge.sourceName, selectedEdge.targetName, originalEdge.forward, forwardSeparatingFunctions)}
          {/if}
          
          {#if originalEdge?.backward}
            {@render directionBlock(selectedEdge.targetName, selectedEdge.sourceName, originalEdge.backward, backwardSeparatingFunctions)}
          {/if}
        </div>
        
        <ReferenceList references={edgeReferences} bind:anchorElement={referencesSection} />
      </div>
      
      <DynamicLegend graphData={legendGraphData} selectedEdge={selectedEdge} viewMode={viewMode} />
    </div>
  </div>
{/if}

<style>
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
</style>
