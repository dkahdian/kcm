<script lang="ts">
  import { onMount } from 'svelte';
  import cytoscape from 'cytoscape';
  // @ts-ignore - dagre doesn't have proper TypeScript types
  import dagre from 'cytoscape-dagre';
  import type { GraphData, KCLanguage } from './types.js';
  
  let { graphData, selectedNode = $bindable() }: { 
    graphData: GraphData; 
    selectedNode: KCLanguage | null;
  } = $props();
  
  let graphContainer: HTMLDivElement;
  let cy: cytoscape.Core;
  
  onMount(() => {
    console.log('KCGraph onMount called', { graphData, graphContainer });
    
    if (!graphContainer) {
      console.error('Graph container not found');
      return;
    }

    // Register the dagre layout extension
    cytoscape.use(dagre);
    
    const elements = [
      // Add nodes
      ...graphData.languages.map(lang => ({
        data: {
          id: lang.id,
          label: lang.name,
          fullName: lang.fullName,
          description: lang.description,
          properties: lang.properties
        },
        position: lang.position || { x: 0, y: 0 }
      })),
      
      // Add edges
      ...graphData.relations.map(rel => ({
        data: {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          label: rel.label || '',
          type: rel.type,
          description: rel.description || ''
        }
      }))
    ];
    
    console.log('Elements for cytoscape:', elements);
    
    // Initialize Cytoscape
    cy = cytoscape({
      container: graphContainer,
      elements,
      
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#ffffff',
            'border-color': '#d1d5db',
            'border-width': 2,
            'color': '#1f2937',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '14px',
            'font-weight': 'bold',
            'width': '80px',
            'height': '80px',
            'shape': 'ellipse',
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
            'width': 2,
            'line-color': '#6b7280',
            'target-arrow-color': '#6b7280',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '12px',
            'color': '#4b5563',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: 'edge[type="succinctness"]',
          style: {
            'line-color': '#1e40af',
            'target-arrow-color': '#1e40af',
            'line-style': 'solid'
          }
        },
        {
          selector: 'edge[type="incomparable"]',
          style: {
            'line-color': '#dc2626',
            'target-arrow-color': '#dc2626',
            'line-style': 'dashed',
            'target-arrow-shape': 'none'
          }
        },
        {
          selector: 'edge[type="equivalence"]',
          style: {
            'line-color': '#059669',
            'target-arrow-color': '#059669',
            'target-arrow-shape': 'triangle-backcurve'
          }
        }
      ],
      
      layout: {
        name: 'grid', // Use grid layout for better initial positioning
        fit: true,
        padding: 50,
        rows: 2,
        cols: 2
      },
      
      // Interaction options
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single'
    });
    
    console.log('Cytoscape instance created:', cy);
    console.log('Number of nodes:', cy.nodes().length);
    console.log('Number of edges:', cy.edges().length);
    
    // Add event listeners
    cy.on('tap', 'node', (evt) => {
      console.log('Node tapped:', evt.target.data());
      const node = evt.target;
      const nodeData = node.data();
      
      // Find the corresponding language data
      const language = graphData.languages.find(lang => lang.id === nodeData.id);
      if (language) {
        selectedNode = language;
      }
    });
    
    // Deselect when clicking on background
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        selectedNode = null;
        cy.elements().unselect();
      }
    });
    
    return () => {
      if (cy) {
        cy.destroy();
      }
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