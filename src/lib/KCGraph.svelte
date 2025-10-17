<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  // @ts-ignore - dagre doesn't have proper TypeScript types
  import dagre from 'cytoscape-dagre';
  import type { GraphData, FilteredGraphData, KCLanguage, CanonicalEdge } from './types.js';
  import { getEdgeEndpointStyle } from './data/relation-types.js';

  let { graphData, selectedNode = $bindable() }: {
    graphData: GraphData | FilteredGraphData;
    selectedNode: KCLanguage | null;
  } = $props();

  let graphContainer: HTMLDivElement;
  let cy: cytoscape.Core;

  /**
   * Assign rank to nodes to ensure polytime edges point upward.
   * Uses a simple topological ordering where if A→B is poly and B→A is not,
   * then A should have higher rank (appear lower in layout).
   */
  function assignNodeRanks(edges: CanonicalEdge[], languages: KCLanguage[]): Map<string, number> {
    const ranks = new Map<string, number>();
    const languageIds = new Set(languages.map(l => l.id));
    
    // Initialize all nodes to rank 0
    for (const lang of languages) {
      ranks.set(lang.id, 0);
    }
    
    // For each edge, if one direction is poly and the other isn't,
    // ensure the non-poly end has higher rank (appears lower)
    for (const edge of edges) {
      if (!languageIds.has(edge.nodeA) || !languageIds.has(edge.nodeB)) continue;
      
      const aToBPoly = edge.aToB === 'poly';
      const bToAPoly = edge.bToA === 'poly';
      
      if (aToBPoly && !bToAPoly) {
        // A → B is poly, B → A is not: A should be below B (higher rank number)
        const rankA = ranks.get(edge.nodeA) || 0;
        const rankB = ranks.get(edge.nodeB) || 0;
        if (rankA <= rankB) {
          ranks.set(edge.nodeA, rankB + 1);
        }
      } else if (bToAPoly && !aToBPoly) {
        // B → A is poly, A → B is not: B should be below A
        const rankA = ranks.get(edge.nodeA) || 0;
        const rankB = ranks.get(edge.nodeB) || 0;
        if (rankB <= rankA) {
          ranks.set(edge.nodeB, rankA + 1);
        }
      }
    }
    
    return ranks;
  }

  // Function to create/update graph
  function createGraph() {
    if (!graphContainer) return;

    // Filter languages if this is filtered graph data
    const isFilteredData = 'visibleLanguageIds' in graphData;
    const visibleLanguageIds = isFilteredData ? graphData.visibleLanguageIds : null;
    
    const visibleLanguages = graphData.languages
      .filter(lang => !isFilteredData || visibleLanguageIds!.has(lang.id));

    // Create edges from canonical edge registry
    const edges: cytoscape.ElementDefinition[] = [];
    for (const edge of graphData.edges) {
      // Only include edge if both nodes are visible
      const aVisible = !isFilteredData || visibleLanguageIds!.has(edge.nodeA);
      const bVisible = !isFilteredData || visibleLanguageIds!.has(edge.nodeB);
      
      if (aVisible && bVisible) {
        // Get endpoint styles for both directions
        const aToBStyle = getEdgeEndpointStyle(edge.aToB);
        const bToAStyle = getEdgeEndpointStyle(edge.bToA);
        
        edges.push({
          data: {
            id: edge.id,
            source: edge.nodeA,
            target: edge.nodeB,
            aToBStatus: edge.aToB,
            bToAStatus: edge.bToA,
            description: edge.description || '',
            // Store styling info
            width: 2,
            sourceArrow: bToAStyle.arrow,
            sourceDashed: bToAStyle.dashed,
            targetArrow: aToBStyle.arrow,
            targetDashed: aToBStyle.dashed
          }
        });
      }
    }

    // Assign ranks to ensure polytime edges point upward
    const nodeRanks = assignNodeRanks(graphData.edges, visibleLanguages);

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
          labelSuffix: lang.visual?.labelSuffix || '',
          // Rank for layout ordering
          rank: nodeRanks.get(lang.id) || 0
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
          width: (ele: any) => ele.data('width') || 2,
          'line-color': '#6b7280', // Default gray color for all edges
          'line-style': 'solid', // All edges are solid lines per spec
          'target-arrow-color': '#6b7280',
          'target-arrow-shape': (ele: any) => ele.data('targetArrow') || 'none',
          'target-arrow-fill': (ele: any) => {
            // Hollow = dashed arrowhead substitute
            const dashed = ele.data('targetDashed');
            return dashed ? 'hollow' : 'filled';
          },
          'source-arrow-color': '#6b7280',
          'source-arrow-shape': (ele: any) => ele.data('sourceArrow') || 'none',
          'source-arrow-fill': (ele: any) => {
            // Hollow = dashed arrowhead substitute
            const dashed = ele.data('sourceDashed');
            return dashed ? 'hollow' : 'filled';
          },
          'curve-style': 'bezier',
          // no labels on edges
          'font-size': '0px'
        }
      }
    ];

  // Arrow shapes:
  // 1. Solid direct arrowhead: filled triangle
  // 2. Dashed straight line perpendicular: hollow tee
  // 3. Solid straight line: filled tee
  // 4. Solid straight line and dashed arrowhead: hollow triangle-cross
  // 5. Only dashed arrowhead: hollow triangle-tee
  // 6. Double solid line ||: filled square

    cy = cytoscape({
      container: graphContainer,
      elements,
      style: baseStyles,
      layout: ({
        name: 'dagre',
        fit: true,
        padding: 40,
        rankDir: 'TB', // most succinct at top, least at bottom
        nodeSep: 40,
        edgeSep: 20,
        rankSep: 80,
        // Custom ranking function to ensure solid arrows (poly) point upward
        ranker: 'network-simplex'
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