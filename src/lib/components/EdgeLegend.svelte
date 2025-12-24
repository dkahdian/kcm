<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  import { relationTypes } from '$lib/data/complexities.js';

  type EdgeType = {
    arrow: string;
    filled: boolean;
    label: string;
    description: string;
  };

  const hollowStatuses = new Set([
    'no-poly-unknown-quasi',
    'unknown-poly-quasi',
    'unknown-both'
  ]);

  const edgeTypes: EdgeType[] = relationTypes.map((type) => ({
    arrow: type.style?.targetStyle?.arrow ?? 'triangle',
    filled: !hollowStatuses.has(type.id),
    label: type.name,
    description: type.description ?? ''
  }));

  let containers: HTMLDivElement[] = [];

  onMount(() => {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      edgeTypes.forEach((edge, idx) => {
        const container = containers[idx];
        if (!container) {
          console.warn(`Container ${idx} not found`);
          return;
        }

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

        // Don't use fit - keep exact positioning
        cy.center();
      });
    }, 100);
  });
</script>

<div class="legend">
  <h3 class="text-lg font-semibold text-gray-700 mb-2">Succinctness</h3>
  <p class="text-gray-600 text-sm mb-4">
    Interpret transformations from A to B using these shared classifications.
  </p>
  <div class="legend-items">
    {#each edgeTypes as edge, i}
      <div class="legend-row">
        <div class="edge-example">
          <div class="cyto-container" bind:this={containers[i]}></div>
        </div>
        <div class="description">
          <p class="font-medium text-gray-800 text-sm">{edge.label}</p>
          <p class="text-xs text-gray-600">{edge.description}</p>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .legend {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
    margin: 1rem 0;
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
    line-height: 1.5;
  }
</style>
