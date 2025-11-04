<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  import type { GraphData, FilteredGraphData, SelectedEdge, KCLanguage, PolytimeFlag, TransformationStatus } from '../types.js';
  import { POLYTIME_COMPLEXITIES } from '../data/polytime-complexities.js';

  let {
    graphData,
    selectedNode = null,
    selectedEdge = null
  }: {
    graphData: GraphData | FilteredGraphData;
    selectedNode?: KCLanguage | null;
    selectedEdge?: SelectedEdge | null;
  } = $props();
  
  // Ensure we have a FilteredGraphData type by adding missing properties if needed
  const filteredData = $derived.by(() => {
    if ('visibleLanguageIds' in graphData) {
      return graphData as FilteredGraphData;
    }
    // Convert GraphData to FilteredGraphData by adding all nodes/edges as visible
    const allLanguageIds = new Set(graphData.languages.map(l => l.id));
    const allEdgeIds = new Set<string>();
    const { matrix, languageIds } = graphData.adjacencyMatrix;
    for (let i = 0; i < languageIds.length; i++) {
      for (let j = 0; j < languageIds.length; j++) {
        if (matrix[i][j]) {
          allEdgeIds.add(`${languageIds[i]}->${languageIds[j]}`);
        }
      }
    }
    return {
      ...graphData,
      visibleLanguageIds: allLanguageIds,
      visibleEdgeIds: allEdgeIds
    } as FilteredGraphData;
  });

  type EdgeType = {
    arrow: string;
    filled: boolean;
    description: string;
    status: TransformationStatus;
  };
  
  const allEdgeTypes: EdgeType[] = [
    {
      arrow: 'triangle',
      filled: true,
      description: 'polynomial time.',
      status: 'poly'
    },
    {
      arrow: 'square',
      filled: true,
      description: 'exponential time.',
      status: 'no-quasi'
    },
    {
      arrow: 'tee',
      filled: true,
      description: 'quasipolynomial time.',
      status: 'no-poly-quasi'
    },
    {
      arrow: 'square',
      filled: true,
      description: 'not polynomial time.',
      status: 'not-poly'
    },
    {
      arrow: 'tee',
      filled: false,
      description: 'quasi (?). Not poly.',
      status: 'no-poly-unknown-quasi'
    },
    {
      arrow: 'triangle-cross',
      filled: false,
      description: 'quasi. Poly (?).',
      status: 'unknown-poly-quasi'
    },
    {
      arrow: 'square',
      filled: false,
      description: 'unknown.',
      status: 'unknown-both'
    }
  ];

  // Determine which edge types are actually visible
  const visibleEdgeTypes = $derived.by(() => {
    const statusesInGraph = new Set<TransformationStatus>();
    
    // Collect statuses from adjacency matrix (only for visible edges)
    const { matrix, languageIds } = filteredData.adjacencyMatrix;
    for (let i = 0; i < languageIds.length; i++) {
      for (let j = 0; j < languageIds.length; j++) {
        const relation = matrix[i][j];
        if (relation) {
          // Check if this edge is actually visible (respects edge filters)
          const edgeId = `${languageIds[i]}->${languageIds[j]}`;
          if (filteredData.visibleEdgeIds.has(edgeId)) {
            statusesInGraph.add(relation.status);
          }
        }
      }
    }
    
    // Return only edge types that appear in the visible graph
    return allEdgeTypes.filter(et => statusesInGraph.has(et.status));
  });

  // Determine which operation complexity symbols are visible
  const visibleComplexities = $derived.by(() => {
    const codesInUse = new Set<string>();
    
    // Collect from visible graph nodes
    for (const lang of filteredData.languages) {
      // Queries
      if (lang.properties.queries) {
        for (const support of Object.values(lang.properties.queries)) {
          codesInUse.add(support.polytime);
        }
      }
      // Transformations
      if (lang.properties.transformations) {
        for (const support of Object.values(lang.properties.transformations)) {
          codesInUse.add(support.polytime);
        }
      }
    }
    
    // Also collect from selected node sidebar (if node is selected)
    if (selectedNode) {
      if (selectedNode.properties.queries) {
        for (const support of Object.values(selectedNode.properties.queries)) {
          codesInUse.add(support.polytime);
        }
      }
      if (selectedNode.properties.transformations) {
        for (const support of Object.values(selectedNode.properties.transformations)) {
          codesInUse.add(support.polytime);
        }
      }
    }
    
    // Note: Selected edge doesn't have operation complexities, so no need to check
    
    return Object.values(POLYTIME_COMPLEXITIES).filter(c => codesInUse.has(c.code));
  });

  let containerRefs: { [status: string]: HTMLDivElement | null } = {};

  onMount(() => {
    setTimeout(() => {
      renderAllGraphs();
    }, 100);
  });

  function renderAllGraphs() {
    visibleEdgeTypes.forEach((edge) => {
      const container = containerRefs[edge.status];
      if (!container) {
        return;
      }

      // Clear existing instance
      container.innerHTML = '';

      const cy = cytoscape({
        container,
        elements: [
          { data: { id: 'a', label: 'A' }, position: { x: 20, y: 15 } },
          { data: { id: 'b', label: 'B' }, position: { x: 80, y: 15 } },
          { data: { id: 'edge', source: 'a', target: 'b' } }
        ],
        style: [
          {
            selector: 'node',
            style: {
              'width': 22,
              'height': 22,
              'background-color': '#ffffff',
              'border-width': 2,
              'border-color': '#6b7280',
              'label': 'data(label)',
              'color': '#1f2937',
              'font-size': '11px',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#6b7280',
              'target-arrow-shape': edge.arrow as any,
              'target-arrow-color': '#6b7280',
              'target-arrow-fill': edge.filled ? 'filled' : 'hollow',
              'curve-style': 'straight'
            }
          }
        ],
        layout: {
          name: 'preset'
        } as any,
        userZoomingEnabled: false,
        userPanningEnabled: false,
        boxSelectionEnabled: false,
        autoungrabify: true,
        autounselectify: true,
        minZoom: 1,
        maxZoom: 1
      });

      cy.center();
    });
  }

  // Re-render when visible edge types change
  $effect(() => {
    // Access visibleEdgeTypes to create dependency
    const types = visibleEdgeTypes;
    if (Object.keys(containerRefs).length > 0) {
      setTimeout(() => {
        renderAllGraphs();
      }, 50);
    }
  });
</script>

<div class="legends-container">
  {#if visibleEdgeTypes.length > 0}
    <div class="legend">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Succinctness</h3>
      <p class="text-gray-600 text-sm mb-4">
        A transforms to B in _______
      </p>
      <div class="legend-items">
        {#each visibleEdgeTypes as edge (edge.status)}
          <div class="legend-row">
            <div class="edge-example">
              <div class="cyto-container" bind:this={containerRefs[edge.status]}></div>
            </div>
            <p class="description">{edge.description}</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if visibleComplexities.length > 0}
    <div class="legend-section">
      <h5>Operation Complexity</h5>
      {#each visibleComplexities as complexity}
        <div class="legend-row">
          <span class="complexity-emoji">{complexity.emoji}</span>
          <span title={complexity.description}>{complexity.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .legends-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .legend {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .edge-example {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 100px;
  }

  .cyto-container {
    width: 100px;
    height: 35px;
    flex-shrink: 0;
  }

  .description {
    flex: 1;
    margin: 0;
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.5;
  }

  .legend-section {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
  }

  .legend-section h5 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .legend-section .legend-row {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: #4b5563;
  }

  .complexity-emoji {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: 1rem;
  }
</style>
