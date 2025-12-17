<script lang="ts">
  import MathText from './components/MathText.svelte';
  import type {
    GraphData,
    FilteredGraphData,
    KCLanguage,
    SelectedEdge,
    DirectedSuccinctnessRelation,
    TransformationStatus
  } from './types.js';

  type ViewableGraphData = GraphData | FilteredGraphData;

  const STATUS_LABELS: Record<TransformationStatus, string> = {
    poly: 'Polynomial',
    'no-poly-unknown-quasi': 'No poly · quasi ?',
    'no-poly-quasi': 'Quasi only',
    'unknown-poly-quasi': 'Quasi ✓ · poly ?',
    'unknown-both': 'Unknown',
    'no-quasi': 'No quasi',
    'not-poly': 'No poly'
  };

  const STATUS_CLASSES: Record<TransformationStatus, string> = {
    poly: 'status-poly',
    'no-poly-unknown-quasi': 'status-no-poly-unknown-quasi',
    'no-poly-quasi': 'status-no-poly-quasi',
    'unknown-poly-quasi': 'status-unknown-poly-quasi',
    'unknown-both': 'status-unknown-both',
    'no-quasi': 'status-no-quasi',
    'not-poly': 'status-not-poly'
  };

  const STATUS_SHORT: Record<TransformationStatus, string> = {
    poly: '<=p',
    'no-poly-unknown-quasi': '!p/?q',
    'no-poly-quasi': '!p<=q',
    'unknown-poly-quasi': '?p<=q',
    'unknown-both': '??',
    'no-quasi': '!q',
    'not-poly': '!p'
  };

  let {
    graphData,
    selectedNode = $bindable(),
    selectedEdge = $bindable()
  }: {
    graphData: ViewableGraphData;
    selectedNode: KCLanguage | null;
    selectedEdge: SelectedEdge | null;
  } = $props();

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
    source: MatrixLanguageEntry,
    target: MatrixLanguageEntry
  ): DirectedSuccinctnessRelation | null {
    if (source.id === target.id) return null;
    const { adjacencyMatrix } = graphData;
    const relation = adjacencyMatrix.matrix[source.matrixIndex]?.[target.matrixIndex] ?? null;
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

  function getCellTitle(
    rowLang: KCLanguage,
    colLang: KCLanguage,
    relation: DirectedSuccinctnessRelation | null
  ): string {
    if (!relation) return `${rowLang.name} → ${colLang.name}: no relation`;
    const label = STATUS_LABELS[relation.status];
    const refs = relation.refs?.length ? ` · refs: ${relation.refs.join(', ')}` : '';
    return `${rowLang.name} → ${colLang.name}: ${label}${refs}`;
  }
</script>

<div class="matrix-view" aria-live="polite">
  <div class="matrix-scroll" role="region" aria-label="Adjacency matrix view">
    <table class="matrix-table">
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
                    &MediumSpace;
                  </button>
                </td>
              {:else}
                {@const relation = getRelation(rowLanguage, colLanguage)}
                {#if relation}
                  <td>
                    <button
                      type="button"
                      class={`matrix-cell matrix-cell--button ${STATUS_CLASSES[relation.status]} ${isEdgeSelected(rowLanguage.id, colLanguage.id) ? 'is-selected' : ''}`}
                      onclick={() => handleCellClick(rowLanguage.id, colLanguage.id, relation)}
                      title={getCellTitle(rowLanguage.language, colLanguage.language, relation)}
                    >
                      <span class="cell-short">{STATUS_SHORT[relation.status]}</span>
                      <span class="cell-label">{STATUS_LABELS[relation.status]}</span>
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
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 640px;
    table-layout: fixed;
    font-size: 0.75rem;
  }

  thead th {
    position: sticky;
    top: 0;
    background: #f8fafc;
    z-index: 3;
    border-bottom: 1px solid #e5e7eb;
  }

  .corner-cell {
    width: 120px;
    background: #fff;
    z-index: 4;
  }

  .row-header,
  .col-header {
    width: 120px;
    background: #fff;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    padding: 0;
    text-align: left;
  }

  .row-header {
    position: sticky;
    left: 0;
    z-index: 2;
    background: #f8fafc;
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
    min-width: 80px;
    height: 38px;
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
    background: #fff;
    cursor: default;
    font-size: 0.6rem;
    color: #0f172a;
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

  .matrix-cell.is-selected {
    box-shadow: inset 0 0 0 3px #1d4ed8;
  }

  .status-poly {
    background: #ecfccb;
    color: #166534;
  }

  .status-no-poly-unknown-quasi {
    background: #fef9c3;
    color: #92400e;
  }

  .status-no-poly-quasi {
    background: #fef3c7;
    color: #92400e;
  }

  .status-unknown-poly-quasi {
    background: #fef9c3;
    color: #78350f;
  }

  .status-unknown-both {
    background: #e2e8f0;
    color: #0f172a;
  }

  .status-no-quasi {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-not-poly {
    background: #ffe4e6;
    color: #9d174d;
  }

  @media (max-width: 1024px) {
    .matrix-table {
      min-width: 520px;
    }

    .row-header,
    .col-header,
    .corner-cell {
      width: 100px;
    }
  }
</style>
