<script lang="ts">
  import KCGraph from '$lib/KCGraph.svelte';
  import LanguageInfo from '$lib/LanguageInfo.svelte';
  import { initialGraphData } from '$lib/data.js';
  import type { KCLanguage } from '$lib/types.js';
  
  let selectedNode: KCLanguage | null = null;
</script>

<svelte:head>
  <title>Knowledge Compilation Map</title>
  <meta name="description" content="Interactive visualization of knowledge compilation languages and their relationships" />
</svelte:head>

<div class="app-shell">
  <!-- Header -->
  <header class="app-header">
    <h1 class="title">Knowledge Compilation Map</h1>
  </header>

  <!-- Main Content -->
  <main class="app-main">
    <section class="graph-panel">
      <KCGraph graphData={initialGraphData} bind:selectedNode />
    </section>

    <aside class="side-panel">
      <LanguageInfo selectedLanguage={selectedNode} />
      <div class="legend">
        <h4>Legend</h4>
        {#each initialGraphData.relationTypes as rt}
          <div class="legend-row">
            <span class="line" style={`background:${rt.style?.lineColor ?? '#6b7280'}; ${rt.style?.lineStyle === 'dashed' ? 'border-top:2px dashed '+(rt.style?.lineColor ?? '#6b7280')+'; height:0; background:transparent;' : ''}`}></span>
            <span>{rt.name}{rt.label ? ` (${rt.label})` : ''}</span>
          </div>
        {/each}
      </div>
    </aside>
  </main>
</div>

<style>
  :global(html, body) { height: 100%; margin: 0; }
  :global(body) { overflow: hidden; background: #f9fafb; }

  .app-shell {
    height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .app-header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
  }
  .title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827; }

  .app-main {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.75rem;
    padding: 0.75rem;
    height: 100%;
    min-height: 0; /* allow children to shrink */
  }

  .graph-panel,
  .side-panel {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    min-height: 0; /* critical for no overflow in grid */
    display: flex;
    flex-direction: column;
  }

  .graph-panel { padding: 0.5rem; }
  .graph-panel > :global(div) { height: 100%; }

  .side-panel { padding: 0.75rem; overflow: auto; }

  /* Legend */
  .legend { margin-top: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
  .legend h4 { margin: 0 0 0.5rem; font-weight: 600; color: #111827; }
  .legend-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #374151; }
  .line { display: inline-block; width: 1.25rem; height: 2px; background: #1e40af; }


  /* Ensure KCGraph fills container */
  :global(.kcm-graph-container) { flex: 1 1 auto; min-height: 0; }
</style>
