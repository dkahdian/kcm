<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  // @ts-ignore - dagre doesn't have proper TypeScript types
  import dagre from 'cytoscape-dagre';
  import type { GraphData, KCLanguage, KCRelationType } from './types.js';

  let { graphData, selectedNode = $bindable() }: {
    graphData: GraphData;
    selectedNode: KCLanguage | null;
  } = $props();

  let graphContainer: HTMLDivElement;
  let cy: cytoscape.Core;

  onMount(() => {
    if (!graphContainer) return;
    cytoscape.use(dagre);

    const elements: cytoscape.ElementDefinition[] = [
      ...graphData.languages.map((lang) => ({
        data: {
          id: lang.id,
          label: lang.name,
          fullName: lang.fullName,
          description: lang.description,
          properties: lang.properties
        },
        position: lang.position || { x: 0, y: 0 }
      })),
      ...graphData.relations.map((rel) => ({
        data: {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          label: rel.label || '',
          typeId: rel.typeId,
          description: rel.description || ''
        }
      }))
    ];

  const baseStyles: any[] = [
      {
        selector: 'node',
        style: {
          'background-color': '#ffffff',
          'border-color': '#d1d5db',
          'border-width': 2,
          color: '#1f2937',
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '14px',
          'font-weight': 'bold',
          width: '80px',
          height: '80px',
          shape: 'ellipse',
          'text-wrap': 'wrap',
          'text-max-width': '70px'
        }
      },
      {
        selector: 'node:hover',
        style: {
          'border-color': '#1e40af',
          'border-width': 3,
          'background-color': '#f8fafc'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#3b82f6',
          'border-width': 4,
          'background-color': '#eff6ff'
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#6b7280',
          'target-arrow-color': '#6b7280',
          'target-arrow-shape': 'triangle',
          'source-arrow-color': '#6b7280',
          'source-arrow-shape': 'none',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '12px',
          color: '#4b5563',
          'text-rotation': 'autorotate'
        }
      }
    ];

  const relationTypeStyles: any[] = (graphData.relationTypes || []).map(
      (rt: KCRelationType) => {
        const color = rt.style?.lineColor || '#6b7280';
        const style: any = {
          'line-color': color,
          'target-arrow-color': color,
          'line-style': rt.style?.lineStyle || 'solid',
          width: (rt.style?.width ?? 2) as any,
          'target-arrow-shape': rt.style?.targetArrow || 'triangle'
        };
        // Equivalence edges should be double-arrowed (both directions)
        if (rt.id === 'equivalence') {
          style['source-arrow-shape'] = 'triangle';
          style['source-arrow-color'] = color;
        }
        return {
          selector: `edge[typeId = "${rt.id}"]`,
          style
        };
      }
    );

    cy = cytoscape({
      container: graphContainer,
      elements,
      style: [...baseStyles, ...relationTypeStyles],
      layout: ({
        name: 'dagre',
        fit: true,
        padding: 40,
        rankDir: 'TB', // most succinct at top, least at bottom
        nodeSep: 40,
        edgeSep: 20,
        rankSep: 80
      } as any),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single'
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const id = node.id();
      const language = graphData.languages.find((l) => l.id === id);
      if (language) selectedNode = language;
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        selectedNode = null;
        cy.elements().unselect();
      }
    });

    return () => {
      cy?.destroy();
    };
  });
</script>

<div class="kcm-graph-container">
  <div bind:this={graphContainer} class="w-full h-full"></div>
  
</div>

<style>
  .kcm-graph-container {
    width: 100%;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: #ffffff;
  }
</style>