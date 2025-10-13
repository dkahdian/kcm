<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  // @ts-ignore - dagre doesn't have proper TypeScript types
  import dagre from 'cytoscape-dagre';
  import type { GraphData, FilteredGraphData, KCLanguage, KCRelationType } from './types.js';

  let { graphData, selectedNode = $bindable() }: {
    graphData: GraphData | FilteredGraphData;
    selectedNode: KCLanguage | null;
  } = $props();

  let graphContainer: HTMLDivElement;
  let cy: cytoscape.Core;

  // Function to create/update graph
  function createGraph() {
    if (!graphContainer) return;

    // Filter languages if this is filtered graph data
    const isFilteredData = 'visibleLanguageIds' in graphData;
    const visibleLanguageIds = isFilteredData ? graphData.visibleLanguageIds : null;
    
    const visibleLanguages = graphData.languages
      .filter(lang => !isFilteredData || visibleLanguageIds!.has(lang.id));

    // Collect all edges from relationships arrays, filtering by defaultVisible
    const edges: cytoscape.ElementDefinition[] = [];
    for (const lang of visibleLanguages) {
      if (lang.relationships) {
        for (const rel of lang.relationships) {
          // Check if this relationship type should be visible by default
          const relType = graphData.relationTypes.find(rt => rt.id === rel.typeId);
          const shouldShow = relType?.defaultVisible !== false; // Default to true if not specified
          
          // Only include edge if:
          // 1. Target is visible
          // 2. Relationship type is set to be shown by default
          if (shouldShow && (!isFilteredData || visibleLanguageIds!.has(rel.target))) {
            edges.push({
              data: {
                id: rel.id,
                source: lang.id,
                target: rel.target,
                typeId: rel.typeId,
                description: rel.description || ''
              }
            });
          }
        }
      }
    }

    const elements: cytoscape.ElementDefinition[] = [
      ...visibleLanguages.map((lang) => ({
        data: {
          id: lang.id,
          label: lang.name,
          fullName: lang.fullName,
          description: lang.description,
          properties: lang.properties,
          // Store visual overrides if present
          bgColor: lang.visual?.backgroundColor,
          borderColor: lang.visual?.borderColor,
          borderWidth: lang.visual?.borderWidth,
          labelPrefix: lang.visual?.labelPrefix || '',
          labelSuffix: lang.visual?.labelSuffix || ''
        },
        position: lang.position || { x: 0, y: 0 }
      })),
      ...edges
    ];

  const baseStyles: any[] = [
      {
        selector: 'node',
        style: {
          'background-color': (ele: any) => ele.data('bgColor') || '#ffffff',
          'border-color': (ele: any) => ele.data('borderColor') || '#d1d5db',
          'border-width': (ele: any) => ele.data('borderWidth') || 2,
          color: '#1f2937',
          label: (ele: any) => {
            const prefix = ele.data('labelPrefix') || '';
            const suffix = ele.data('labelSuffix') || '';
            return prefix + ele.data('label') + suffix;
          },
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
          // no labels on edges
          'font-size': '0px'
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
      if (language) {
        // Reset all other nodes to base state before selecting new node
        cy.nodes().forEach(n => {
          if (n.id() !== id) {
            n.style({
              'border-color': '#d1d5db',
              'border-width': 2,
              'background-color': '#ffffff'
            });
          }
        });
        selectedNode = language;
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        selectedNode = null;
        // Reset all node styles to base state when deselecting
        cy.nodes().forEach(node => {
          node.style({
            'border-color': '#d1d5db',
            'border-width': 2,
            'background-color': '#ffffff'
          });
        });
        cy.elements().unselect();
      }
    });

    // Add hover effects
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.style({
        'border-color': '#1e40af',
        'border-width': 3,
        'background-color': '#f8fafc'
      });
    });

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      // Reset to base style unless selected
      if (!node.selected()) {
        node.style({
          'border-color': '#d1d5db',
          'border-width': 2,
          'background-color': '#ffffff'
        });
      }
    });

  }

  onMount(() => {
    cytoscape.use(dagre);
    createGraph();
    
    return () => {
      cy?.destroy();
    };
  });

  // Recreate graph when data changes
  $effect(() => {
    if (graphContainer) {
      cy?.destroy();
      createGraph();
    }
  });
</script>

<div class="kcm-graph-container">
  <div bind:this={graphContainer} class="w-full h-full"></div>
  <!-- Y-axis overlay: More succinct (top) to Less succinct (bottom) -->
  <div class="y-axis" aria-hidden="true">
    <div class="axis-label axis-label-top">More succinct</div>
    <div class="axis-line"></div>
    <div class="axis-label axis-label-bottom">Less succinct</div>
  </div>
</div>

<style>
  .kcm-graph-container {
    width: 100%;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: #ffffff;
    position: relative;
  }

  /* Overlay Y-axis (does not capture events) */
  .y-axis {
    position: absolute;
    left: 8px;
    top: 8px;
    bottom: 8px;
    width: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
    color: #1f2937; /* gray-800 */
    font-size: 10px;
    text-align: center;
  }

  .axis-line {
    flex: 1 1 auto;
    width: 2px;
    background: linear-gradient(#1e3a8a, #93c5fd); /* blue-800 to blue-300 */
    border-radius: 1px;
    margin: 6px 0;
    opacity: 0.6;
  }

  .axis-label {
    writing-mode: vertical-rl;
    line-height: 1;
    background: transparent;
    border: none;
    padding: 0;
    opacity: 0.85;
  }

  .axis-label-top {
    margin-bottom: 6px;
  }

  .axis-label-bottom {
    margin-top: 6px;
  }
</style>