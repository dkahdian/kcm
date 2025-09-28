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


  /* Ensure KCGraph fills container */
  :global(.kcm-graph-container) { flex: 1 1 auto; min-height: 0; }
</style>
