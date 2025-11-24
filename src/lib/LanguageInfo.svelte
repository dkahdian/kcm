<script lang="ts">
  import MathText from './components/MathText.svelte';
  import type { 
    KCLanguage, 
    GraphData, 
    KCOpEntry, 
    KCOpSupportMap, 
    SelectedEdge,
    FilteredGraphData,
    KCLanguagePropertiesResolved,
    TransformationStatus
  } from './types.js';
  import { QUERIES, TRANSFORMATIONS, resolveLanguageProperties } from './data/operations.js';
  import { POLYTIME_COMPLEXITIES, getPolytimeFlag } from './data/polytime-complexities.js';
  import EdgeLegend from './components/EdgeLegend.svelte';
  import DynamicLegend from './components/DynamicLegend.svelte';

  let {
    selectedLanguage,
    graphData,
    onEdgeSelect
  }: {
    selectedLanguage: KCLanguage | null;
    graphData: GraphData | FilteredGraphData;
    onEdgeSelect: (edge: SelectedEdge) => void;
  } = $props();
  
  // Combine all operations for display
  const KC_OPERATIONS = { ...QUERIES, ...TRANSFORMATIONS };  // Resolve the properties to get full operation entries
  // Note: If the fill-unknown-operations filter is active, properties will already be resolved,
  // but we resolve again here for safety in case selectedLanguage comes from unfiltered data
  let resolvedProperties: KCLanguagePropertiesResolved | null = $derived(
    selectedLanguage ? resolveLanguageProperties(
      selectedLanguage.properties.queries,
      selectedLanguage.properties.transformations
    ) : null
  );

  let referencesSection: HTMLElement | null = $state(null);
  let copiedRefId: string | null = $state(null);

  interface RelationshipStatement {
    target: string;
    linkText: string;
    suffixText: string;
    refs: string[];
  }

  const languageLookup = $derived.by<Map<string, KCLanguage>>(() => {
    const lookup = new Map<string, KCLanguage>();
    for (const language of graphData.languages) {
      lookup.set(language.id, language);
    }
    return lookup;
  });

  // Helper to generate a descriptive statement from a transformation status
  function getStatusDescription(status: TransformationStatus, fromLang: string, toLang: string): { linkText: string; suffixText: string } {
    const from = languageLookup.get(fromLang)?.name ?? fromLang;
    const to = languageLookup.get(toLang)?.name ?? toLang;
    const linkText = `${from} converts to ${to}`;
    
    switch (status) {
      case 'poly':
        return { linkText, suffixText: ' in polynomial time' };
      case 'no-quasi':
        return { linkText: `Exponential gap between ${from} and ${to}`, suffixText: '' };
      case 'no-poly-quasi':
        return { linkText, suffixText: ' in quasi-polynomial time only' };
      case 'no-poly-unknown-quasi':
        return { linkText: `No polynomial transformation from ${from} to ${to}`, suffixText: '; quasi-polynomial unknown' };
      case 'unknown-poly-quasi':
        return { linkText: `Polynomial transformation unknown from ${from} to ${to}`, suffixText: '; quasi-polynomial exists' };
      case 'unknown-both':
        return { linkText: `Complexity of transformation from ${from} to ${to}`, suffixText: ' is unknown' };
      default:
        return { linkText: `${from} relates to ${to}`, suffixText: '' };
    }
  }

  const languageRelationships = $derived.by<RelationshipStatement[]>(() => {
    if (!selectedLanguage) return [];
    const { id, name } = selectedLanguage;
    const { adjacencyMatrix } = graphData;

    const statements: RelationshipStatement[] = [];
    const forwardStatuses = new Map<string, TransformationStatus>();

    const sourceIndex = adjacencyMatrix.indexByLanguage[id];
    if (sourceIndex === undefined) return statements;

    const { languageIds, matrix } = adjacencyMatrix;

    for (let targetIndex = 0; targetIndex < languageIds.length; targetIndex += 1) {
      const relation = matrix[sourceIndex]?.[targetIndex];
      if (!relation) continue;

      const target = languageIds[targetIndex];
      forwardStatuses.set(target, relation.status);
      const desc = getStatusDescription(relation.status, name, target);
      statements.push({
        target,
        linkText: desc.linkText,
        suffixText: desc.suffixText,
        refs: relation.refs ?? []
      });
    }

    for (let sourceIndexIter = 0; sourceIndexIter < languageIds.length; sourceIndexIter += 1) {
      if (sourceIndexIter === sourceIndex) continue;

      const relation = matrix[sourceIndexIter]?.[sourceIndex];
      if (!relation) continue;

      const source = languageIds[sourceIndexIter];
      const forwardStatus = forwardStatuses.get(source);
      if (forwardStatus && forwardStatus === relation.status) {
        continue;
      }

      const desc = getStatusDescription(relation.status, source, name);
      statements.push({
        target: source,
        linkText: desc.linkText,
        suffixText: desc.suffixText,
        refs: relation.refs ?? []
      });
    }

    return statements.sort((a, b) => {
      const aName = languageLookup.get(a.target)?.name ?? a.target;
      const bName = languageLookup.get(b.target)?.name ?? b.target;
      return aName.localeCompare(bName);
    });
  });

  const statusEmoji = (op: KCOpEntry) => {
    return getPolytimeFlag(op.polytime).emoji;
  };

  function scrollToReferences(e: MouseEvent) {
    e.preventDefault();
    referencesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Helper to get the display number (1-based) for a reference ID
  function getRefNumber(refId: string): number {
    if (!selectedLanguage?.references) return 0;
    const idx = selectedLanguage.references.findIndex(ref => ref.id === refId);
    return idx >= 0 ? idx + 1 : 0;
  }

  // Copy BibTeX to clipboard
  async function copyBibtex(bibtex: string, refId: string) {
    try {
      await navigator.clipboard.writeText(bibtex);
      copiedRefId = refId;
      // Reset after 2 seconds
      setTimeout(() => {
        copiedRefId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy BibTeX:', err);
    }
  }

  function selectEdge(targetId: string) {
    if (!selectedLanguage || !onEdgeSelect) return;
    
    const sourceId = selectedLanguage.id;
    const nodeA = sourceId < targetId ? sourceId : targetId;
    const nodeB = sourceId < targetId ? targetId : sourceId;
    
    const sourceIndex = graphData.adjacencyMatrix.indexByLanguage[nodeA];
    const targetIndex = graphData.adjacencyMatrix.indexByLanguage[nodeB];
    
    const forwardRelation = sourceIndex !== undefined && targetIndex !== undefined 
      ? graphData.adjacencyMatrix.matrix[sourceIndex]?.[targetIndex] ?? null
      : null;
    const backwardRelation = sourceIndex !== undefined && targetIndex !== undefined
      ? graphData.adjacencyMatrix.matrix[targetIndex]?.[sourceIndex] ?? null
      : null;
    
    const sourceLang = graphData.languages.find(l => l.name === nodeA);
    const targetLang = graphData.languages.find(l => l.name === nodeB);
    
    if (sourceLang && targetLang) {
      onEdgeSelect({
        id: `${nodeA}-${nodeB}`,
        source: nodeA,
        target: nodeB,
        sourceName: sourceLang.name,
        targetName: targetLang.name,
        forward: forwardRelation,
        backward: backwardRelation,
        refs: [...(forwardRelation?.refs || []), ...(backwardRelation?.refs || [])]
      });
    }
  }
</script>

<div class="content-wrapper">
  <div class="scrollable-content">
    {#if selectedLanguage}
      <div class="language-details">
        <MathText as="h3" className="text-xl font-bold text-gray-900 mb-2" text={selectedLanguage.name} />
        <MathText as="h4" className="text-sm text-gray-600 mb-4" text={selectedLanguage.fullName} />
        
        <p class="text-gray-700 mb-6">
          <MathText text={selectedLanguage.description} className="inline" />{#if selectedLanguage.descriptionRefs?.length}{#each selectedLanguage.descriptionRefs as refId}<button 
                class="ref-badge"
                onclick={scrollToReferences}
                title="View reference"
              >[{getRefNumber(refId)}]</button>{/each}{:else}<span class="missing-ref" title="Missing reference">[missing ref]</span>{/if}
        </p>

        {#if selectedLanguage.tags?.length}
          <div class="mb-4 flex flex-wrap gap-2">
            {#each selectedLanguage.tags as tag}
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={`background:${tag.color ?? '#e5e7eb'}20; color:${tag.color ?? '#374151'}; border:1px solid ${tag.color ?? '#e5e7eb'}`}
                title={tag.description || ''}>
                {tag.label}
                {#if tag.refs?.length}
                  {#each tag.refs as refId}
                    <button 
                      class="ref-badge inline"
                      onclick={scrollToReferences}
                      title="View reference"
                    >[{getRefNumber(refId)}]</button>
                  {/each}
                {:else}
                  <span class="missing-ref inline" title="Missing reference">[missing ref]</span>
                {/if}
              </span>
            {/each}
          </div>
        {/if}
        
        <div class="space-y-4">
          <div>
            <h5 class="font-semibold text-gray-900 mb-2">Queries</h5>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              {#each resolvedProperties?.queries ?? [] as q}
                <div class="grid grid-cols-[auto,1fr] items-start gap-x-2">
                  <span class="shrink-0 text-base leading-none">{statusEmoji(q)}</span>
                  <div class="text-sm leading-5">
                    <div>
                      <strong>{q.code}</strong>
                      {#if q.label}
                        <span> (</span>
                        <MathText text={q.label} className="inline" />
                        <span>)</span>
                      {/if}
                      {#if q.refs?.length}{#each q.refs as refId}<button 
                            class="ref-badge"
                            onclick={scrollToReferences}
                            title="View reference"
                          >[{getRefNumber(refId)}]</button>{/each}{:else}<span class="missing-ref" title="Missing reference">[missing ref]</span>{/if}
                    </div>
                    {#if q.note}
                      <MathText text={q.note} className="text-xs text-gray-500" />
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div>
            <h5 class="font-semibold text-gray-900 mb-2">Transformations</h5>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              {#each resolvedProperties?.transformations ?? [] as t}
                <div class="grid grid-cols-[auto,1fr] items-start gap-x-2">
                  <span class="shrink-0 text-base leading-none">{statusEmoji(t)}</span>
                  <div class="text-sm leading-5">
                    <div>
                      <strong>{t.code}</strong>
                      {#if t.label}
                        <span> (</span>
                        <MathText text={t.label} className="inline" />
                        <span>)</span>
                      {/if}
                      {#if t.refs?.length}{#each t.refs as refId}<button 
                            class="ref-badge"
                            onclick={scrollToReferences}
                            title="View reference"
                          >[{getRefNumber(refId)}]</button>{/each}{:else}<span class="missing-ref" title="Missing reference">[missing ref]</span>{/if}
                    </div>
                    {#if t.note}
                      <MathText text={t.note} className="text-xs text-gray-500" />
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
        {#if languageRelationships.length}
          <!-- TODO: Fix multi-line link text causing newline injection before suffix -->
          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h5 class="font-semibold text-gray-900 mb-2">Relationships</h5>
            <div class="space-y-1 text-sm">
              {#each languageRelationships as statement}
                <div class="flex items-start gap-2">
                  <div class="flex-1 text-gray-700">
                    <button 
                      class="edge-link"
                      onclick={() => selectEdge(statement.target)}
                      title="View edge details"
                    >
                      <MathText text={statement.linkText} className="inline" />
                    </button>
                    <span> </span>
                    <MathText text={statement.suffixText} className="inline" />
                    {#if statement.refs?.length}
                      {#each statement.refs as refId}
                        <button 
                          class="ref-badge"
                          onclick={scrollToReferences}
                          title="View reference"
                        >[{getRefNumber(refId)}]</button>
                      {/each}
                    {:else}
                      <span class="missing-ref" title="Missing reference">[missing ref]</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <div class="mt-4 pt-4 border-t border-gray-200" bind:this={referencesSection}>
          {#if selectedLanguage.references?.length}
            <div class="mb-2">
              <h6 class="text-sm font-semibold text-gray-900 mb-2">References</h6>
                            <ol class="space-y-2">
                {#each selectedLanguage.references as ref, idx}
                  <li class="text-xs text-gray-700">
                    <div class="flex items-start gap-1.5">
                      <span class="font-semibold text-gray-900">[{idx + 1}]</span>
                      <div class="flex-1 min-w-0">
                        <a class="underline text-blue-600 hover:text-blue-800 break-words" href={ref.href} target="_blank" rel="noreferrer noopener">{ref.title}</a>
                        <button
                          class="font-medium cursor-pointer ml-2 transition-colors"
                          class:text-green-600={copiedRefId !== ref.id}
                          class:hover:text-green-800={copiedRefId !== ref.id}
                          class:text-green-700={copiedRefId === ref.id}
                          onclick={() => copyBibtex(ref.bibtex, ref.id)}
                          title="Copy BibTeX citation"
                        >
                          {copiedRefId === ref.id ? '[✓ copied]' : '[copy bibtex]'}
                        </button>
                      </div>
                    </div>
                  </li>
                {/each}
              </ol>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="welcome-message">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Knowledge Compilation Map</h3>
        <p class="text-gray-600 text-sm mb-4">
          Click on a node or edge for more information.
        </p>
      </div>
    {/if}
    
    <DynamicLegend graphData={graphData} selectedNode={selectedLanguage} />
  </div>
</div>
  
  <style>
    .content-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    
    .scrollable-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding-bottom: 1rem;
    }
    
    .language-details, .welcome-message {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .ref-badge {
      display: inline;
      font-size: 0.7em;
      vertical-align: super;
      line-height: 0;
      color: #2563eb;
      background: none;
      border: none;
      padding: 0;
      margin: 0 0.1em;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    
    .ref-badge:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }

    .ref-badge.inline {
      margin-left: 0.25em;
    }

    .edge-link {
      display: inline;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: rgba(37, 99, 235, 0.3);
      transition: text-decoration-color 0.15s ease;
    }
    
    .edge-link:hover {
      text-decoration-color: rgba(37, 99, 235, 0.8);
    }

    .missing-ref {
      display: inline;
      font-size: 0.65em;
      vertical-align: super;
      line-height: 0;
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.25rem;
      padding: 0.1em 0.3em;
      margin: 0 0.2em;
      font-weight: 600;
      white-space: nowrap;
    }

    .missing-ref.inline {
      margin-left: 0.25em;
    }
  </style>