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
            { data: { id: 'a' }, position: { x: 15, y: 15 } },
            { data: { id: 'b' }, position: { x: 105, y: 15 } },
            { data: { id: 'edge', source: 'a', target: 'b' } }
          ],
          style: [
            {
              selector: 'node',
              style: {
                'width': 10,
                'height': 10,
                'background-color': '#9ca3af',
                'border-width': 0,
                'label': ''
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

        // Fit the graph to container
        cy.fit(undefined, 5);
      });
    }, 100);
  });
</script>

<div class="legend">
  <h3>A can transform to B in </h3>
  <div class="legend-items">
    {#each edgeTypes as edge, i}
      <div class="legend-row">
        <div class="edge-example">
          <span class="node-label">A</span>
          <div class="cyto-container" bind:this={containers[i]}></div>
          <span class="node-label">B</span>
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
    min-width: 180px;
  }

  .node-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #1f2937;
  }

  .cyto-container {
    width: 120px;
    height: 30px;
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
