<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';

  type EdgeType = {
    arrow: string;
    filled: boolean;
    description: string;
  };
  
  const edgeTypes: EdgeType[] = [
    {
      arrow: 'triangle',
      filled: true,
      description: 'polytime.'
    },
    {
      arrow: 'tee',
      filled: true,
      description: 'quasipoly.'
    },
    {
      arrow: 'tee',
      filled: false,
      description: 'quasi (?). Not poly.'
    },
    {
      arrow: 'triangle-cross',
      filled: false,
      description: 'quasi. Poly (?).'
    },
    {
      arrow: 'square',
      filled: false,
      description: 'unknown.'
    },
    {
      arrow: 'square',
      filled: true,
      description: 'exponential only.'
    }
  ];

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
  <h3>Transformation complexity (A → B)</h3>
  <div class="legend-items">
    {#each edgeTypes as edge, i}
      <div class="legend-row">
        <div class="edge-example">
          <div class="cyto-container" bind:this={containers[i]}></div>
        </div>
        <p class="description">{edge.description}</p>
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

  .node-label {
    display: none;
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
</style>
