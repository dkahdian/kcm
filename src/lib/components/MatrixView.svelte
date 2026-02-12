<script lang="ts">
  import MathText from './MathText.svelte';
  import type {
    GraphData,
    FilteredGraphData,
    KCLanguage,
    SelectedEdge,
    DirectedSuccinctnessRelation
  } from '$lib/types.js';
  import { measureCellSize } from '$lib/utils/matrix-cell-size.js';

  let {
    graphData,
    selectedNode = $bindable(),
    selectedEdge = $bindable()
  }: {
    graphData: GraphData | FilteredGraphData;
    selectedNode: KCLanguage | null;
    selectedEdge: SelectedEdge | null;
  } = $props();

  const STATUS_LABELS = $derived.by<Record<string, string>>(() => {
    return Object.fromEntries(Object.values(graphData.complexities).map((c) => [c.code, c.label]));
  });

  const STATUS_CLASSES = $derived.by<Record<string, string>>(() => {
    return Object.fromEntries(Object.values(graphData.complexities).map((c) => [c.code, c.cssClass]));
  });

  const STATUS_SHORT = $derived.by<Record<string, string>>(() => {
    return Object.fromEntries(Object.values(graphData.complexities).map((c) => [c.code, c.notation]));
  });

  const languageLookup = $derived.by<Map<string, KCLanguage>>(() => {
    const map = new Map<string, KCLanguage>();
    for (const language of graphData.languages) {
      map.set(language.id, language);
    }
    return map;
  });

  const visibleLanguageIds = $derived.by<string[]>(() => {
    const ids = graphData.adjacencyMatrix.languageIds.filter((id) => languageLookup.has(id));
    if ('visibleLanguageIds' in graphData && graphData.visibleLanguageIds.size > 0) {
      return ids.filter((id) => graphData.visibleLanguageIds.has(id));
    }
    return ids;
  });

  type MatrixLanguageEntry = {
    id: string;
    language: KCLanguage;
    matrixIndex: number;
  };

  const matrixLanguages = $derived.by<MatrixLanguageEntry[]>(() => {
    const entries: MatrixLanguageEntry[] = [];
    for (const id of visibleLanguageIds) {
      const language = languageLookup.get(id);
      const matrixIndex = graphData.adjacencyMatrix.indexByLanguage[id];
      if (!language || typeof matrixIndex !== 'number') continue;
      entries.push({ id, language, matrixIndex });
    }
    return entries;
  });

  const visibleEdgeIds = $derived.by<Set<string> | null>(() => ('visibleEdgeIds' in graphData ? graphData.visibleEdgeIds : null));

  function getRelation(
    rowLanguage: MatrixLanguageEntry,
    colLanguage: MatrixLanguageEntry
  ): DirectedSuccinctnessRelation | null {
    // In transposed view: rows = targets, columns = sources
    // So cell (row, col) shows relation from col → row
    if (rowLanguage.id === colLanguage.id) return null;
    const { adjacencyMatrix } = graphData;
    const relation = adjacencyMatrix.matrix[colLanguage.matrixIndex]?.[rowLanguage.matrixIndex] ?? null;
    return relation;
  }

  function buildSelectedEdge(sourceId: string, targetId: string): SelectedEdge | null {
    if (sourceId === targetId) return null;
    const { adjacencyMatrix } = graphData;
    const sourceIndex = adjacencyMatrix.indexByLanguage[sourceId];
    const targetIndex = adjacencyMatrix.indexByLanguage[targetId];
    if (sourceIndex === undefined || targetIndex === undefined) return null;

    const sourceLang = languageLookup.get(sourceId);
    const targetLang = languageLookup.get(targetId);
    if (!sourceLang || !targetLang) return null;

    const forward = adjacencyMatrix.matrix[sourceIndex]?.[targetIndex] ?? null;
    const backward = adjacencyMatrix.matrix[targetIndex]?.[sourceIndex] ?? null;
    const refs = [
      ...(forward?.refs ?? []),
      ...(backward?.refs ?? [])
    ];

    const canonicalSource = sourceId < targetId ? sourceId : targetId;
    const canonicalTarget = sourceId < targetId ? targetId : sourceId;

    return {
      id: `${canonicalSource}-${canonicalTarget}`,
      source: sourceId,
      target: targetId,
      sourceName: sourceLang.name,
      targetName: targetLang.name,
      forward,
      backward,
      refs
    };
  }

  function handleRowHeaderClick(language: KCLanguage) {
    selectedEdge = null;
    selectedNode = language;
  }

  function handleColumnHeaderClick(language: KCLanguage) {
    selectedEdge = null;
    selectedNode = language;
  }

  function handleCellClick(sourceId: string, targetId: string, relation: DirectedSuccinctnessRelation | null) {
    if (!relation) {
      selectedEdge = null;
      return;
    }
    const edge = buildSelectedEdge(sourceId, targetId);
    if (edge) {
      selectedNode = null;
      selectedEdge = edge;
    }
  }

  function isEdgeSelected(sourceId: string, targetId: string): boolean {
    if (!selectedEdge) return false;
    const { source, target } = selectedEdge;
    return source === sourceId && target === targetId;
  }

  function isComplementSelected(sourceId: string, targetId: string): boolean {
    if (!selectedEdge) return false;
    const { source, target } = selectedEdge;
    // Complement is the reverse direction
    return source === targetId && target === sourceId;
  }

  function getCellTitle(
    rowLang: KCLanguage,
    colLang: KCLanguage,
    relation: DirectedSuccinctnessRelation | null
  ): string {
    // In transposed view: cell (row, col) shows relation from col → row
    if (!relation) return `${colLang.name} → ${rowLang.name}: no relation`;
    const label = STATUS_LABELS[relation.status];
    const refs = relation.refs?.length ? ` · refs: ${relation.refs.join(', ')}` : '';
    return `${colLang.name} → ${rowLang.name}: ${label}${refs}`;
  }

  // Dynamic cell sizing
  let matrixScrollEl: HTMLDivElement;
  let tableEl: HTMLTableElement;
  let cellSize = $state({ width: 0, height: 0 });
  let measured = $state(false);

  function updateCellSize() {
    const numCells = matrixLanguages.length + 1; // +1 for header
    const result = measureCellSize(matrixScrollEl, tableEl, numCells, numCells);
    if (result) {
      cellSize = result;
      measured = true;
    }
  }

  $effect(() => {
    // Re-measure when languages change
    matrixLanguages;
    measured = false;
    // Use microtask to ensure DOM is updated
    queueMicrotask(() => updateCellSize());
  });

  // Also measure on mount and resize
  import { onMount } from 'svelte';
  onMount(() => {
    updateCellSize();
    const resizeObserver = new ResizeObserver(() => updateCellSize());
    if (matrixScrollEl) resizeObserver.observe(matrixScrollEl);
    return () => resizeObserver.disconnect();
  });
</script>

<div class="matrix-view" aria-live="polite">
  <div class="matrix-scroll" bind:this={matrixScrollEl} role="region" aria-label="Adjacency matrix view">
    <table 
      class="matrix-table" 
      bind:this={tableEl}
      style:--cell-width="{cellSize.width}px"
      style:--cell-height="{cellSize.height}px"
      class:measured
    >
      <thead>
        <tr>
          <th class="corner-cell" aria-hidden="true"></th>
          {#each matrixLanguages as column}
            <th class={`col-header ${selectedNode?.id === column.id ? 'is-active' : ''}`}>
              <button type="button" onclick={() => handleColumnHeaderClick(column.language)} title={`Select ${column.language.name}`}>
                <MathText text={column.language.name} className="inline" />
              </button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each matrixLanguages as rowLanguage}
          <tr>
            <th class={`row-header ${selectedNode?.id === rowLanguage.id ? 'is-active' : ''}`}>
              <button type="button" onclick={() => handleRowHeaderClick(rowLanguage.language)} title={`Select ${rowLanguage.language.name}`}>
                <MathText text={rowLanguage.language.name} className="inline" />
              </button>
            </th>
            {#each matrixLanguages as colLanguage}
              {#if rowLanguage.id === colLanguage.id}
                <td class="matrix-cell--diagonal">
                  <button
                    type="button"
                    class="diagonal-button"
                    onclick={() => handleRowHeaderClick(rowLanguage.language)}
                    aria-label={`Select ${rowLanguage.language.name}`}
                    title={`Select ${rowLanguage.language.name}`}
                  >
                    =
                  </button>
                </td>
              {:else}
                {@const relation = getRelation(rowLanguage, colLanguage)}
                {#if relation}
                  <td>
                    <button
                      type="button"
                      class={`matrix-cell matrix-cell--button ${STATUS_CLASSES[relation.status]} ${relation.dimmed ? 'is-dimmed' : ''} ${relation.explicit ? 'is-explicit' : ''} ${isEdgeSelected(colLanguage.id, rowLanguage.id) ? 'is-selected' : ''} ${isComplementSelected(colLanguage.id, rowLanguage.id) ? 'is-complement' : ''}`}
                      onclick={() => handleCellClick(colLanguage.id, rowLanguage.id, relation)}
                      title={getCellTitle(rowLanguage.language, colLanguage.language, relation)}
                    >
                      <span class="cell-short"><MathText text={STATUS_SHORT[relation.status]} className="inline" />{#if relation.caveat}*{/if}</span>
                    </button>
                  </td>
                {:else}
                  <td class="matrix-cell--empty" title={getCellTitle(rowLanguage.language, colLanguage.language, null)}>&nbsp;</td>
                {/if}
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .matrix-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .matrix-scroll {
    flex: 1;
    overflow: auto;
    width: 100%;
  }

  .matrix-table {
    width: auto;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 0.75rem;
  }

  /* Before measurement, let cells size naturally */
  .matrix-table:not(.measured) th,
  .matrix-table:not(.measured) td {
    width: auto;
    min-width: auto;
    max-width: none;
  }

  /* After measurement, use computed cell size */
  .matrix-table.measured th,
  .matrix-table.measured td {
    width: var(--cell-width, auto);
    min-width: var(--cell-width, auto);
    max-width: var(--cell-width, none);
    height: var(--cell-height, auto);
  }

  thead th {
    position: sticky;
    top: 0;
    background: #f8fafc;
    z-index: 5;
    border-bottom: 1px solid #e5e7eb;
  }

  .corner-cell {
    background: #e5e7eb;
    z-index: 6;
    border-left: 1px solid #e5e7eb;
  }

  .row-header,
  .col-header {
    background: #fff;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    padding: 0;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-header {
    position: sticky;
    left: 0;
    z-index: 4;
    background: #f8fafc;
    border-left: 1px solid #e5e7eb;
  }

  .row-header button,
  .col-header button {
    width: 100%;
    height: 100%;
    padding: 0.25rem 0.35rem;
    text-align: left;
    background: transparent;
    border: none;
    cursor: pointer;
    font-weight: 600;
    color: #1f2937;
    font-size: 0.8rem;
  }

  .row-header.is-active,
  .col-header.is-active {
    background: #e0f2fe;
  }

  tbody th {
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    text-align: center;
    padding: 0;
  }

  .matrix-cell {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    border: none;
    cursor: default;
    font-size: 0.6rem;
  }

  .matrix-cell--button {
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
    padding: 0.2rem 0.25rem;
  }

  .matrix-cell--button:is(:hover, :focus-visible) {
    box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.2);
  }

  .matrix-cell--diagonal {
    background: #e5e7eb;
  }

  .diagonal-button {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .diagonal-button:hover {
    background: #d1d5db;
    color: #6b7280;
  }

  .matrix-cell--empty {
    background: #fff;
    color: #94a3b8;
  }

  .cell-short {
    font-weight: 600;
    font-size: 0.65rem;
  }

  .cell-label {
    font-size: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Explicit edges - golden border to highlight non-derived edges */
  .matrix-cell.is-explicit {
    box-shadow: inset 0 0 0 2px #eab308; /* yellow-500 golden border */
  }

  /* Selection borders override explicit border */
  .matrix-cell.is-selected {
    box-shadow: inset 0 0 0 3px #1d4ed8; /* blue border for selected */
  }

  .matrix-cell.is-complement {
    box-shadow: inset 0 0 0 3px #dc2626; /* red border for complement */
  }

  /* Dimmed/implicit edges - diagonal gray stripes overlay */
  .matrix-cell.is-dimmed {
    position: relative;
  }

  .matrix-cell.is-dimmed::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 6px,
      rgba(156, 163, 175, 0.3) 6px,
      rgba(156, 163, 175, 0.3) 7px
    );
    pointer-events: none;
    z-index: 1;
  }

  .matrix-cell.is-dimmed .cell-short {
    position: relative;
    z-index: 2;
  }

  @media (max-width: 1024px) {
    .matrix-table {
      min-width: 400px;
    }

    .row-header,
    .col-header,
    .corner-cell {
      width: 80px;
    }
  }
</style>
