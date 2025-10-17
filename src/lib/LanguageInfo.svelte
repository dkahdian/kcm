<script lang="ts">
  import type {
    KCLanguage,
    KCOpEntry,
    GraphData,
    KCLanguagePropertiesResolved,
    TransformationStatus
  } from './types.js';
  import { resolveLanguageProperties } from './data/operations.js';
  import { getPolytimeFlag, POLYTIME_COMPLEXITIES } from './data/polytime-complexities.js';
  import EdgeLegend from './components/EdgeLegend.svelte';
  
  let { selectedLanguage, graphData }: { selectedLanguage: KCLanguage | null, graphData: GraphData } = $props();
  
  // Resolve the properties to get full operation entries
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
    text: string;
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
  function getStatusDescription(status: TransformationStatus, fromLang: string, toLang: string): string {
    const from = languageLookup.get(fromLang)?.name ?? fromLang;
    const to = languageLookup.get(toLang)?.name ?? toLang;
    
    switch (status) {
      case 'poly':
        return `${from} converts to ${to} in polynomial time`;
      case 'no-quasi':
        return `Exponential gap between ${from} and ${to}`;
      case 'no-poly-quasi':
        return `${from} converts to ${to} in quasi-polynomial time only`;
      case 'no-poly-unknown-quasi':
        return `No polynomial transformation from ${from} to ${to}; quasi-polynomial unknown`;
      case 'unknown-poly-quasi':
        return `Polynomial transformation unknown from ${from} to ${to}; quasi-polynomial exists`;
      case 'unknown-both':
        return `Complexity of transformation from ${from} to ${to} is unknown`;
      default:
        return `${from} relates to ${to}`;
    }
  }

  const languageRelationships = $derived.by<RelationshipStatement[]>(() => {
    if (!selectedLanguage) return [];
    const { id } = selectedLanguage;

    const statements: RelationshipStatement[] = [];
    
    for (const edge of graphData.edges) {
      if (edge.nodeA === id || edge.nodeB === id) {
        const isSourceNodeA = edge.nodeA === id;
        const target = isSourceNodeA ? edge.nodeB : edge.nodeA;
        const forwardStatus = isSourceNodeA ? edge.aToB : edge.bToA;
        const backwardStatus = isSourceNodeA ? edge.bToA : edge.aToB;
        
        // Add forward direction statement
        statements.push({
          target,
          text: getStatusDescription(forwardStatus, id, target),
          refs: edge.refs ?? []
        });
        
        // Add backward direction statement (unless it's the same as forward)
        if (forwardStatus !== backwardStatus) {
          statements.push({
            target,
            text: getStatusDescription(backwardStatus, target, id),
            refs: edge.refs ?? []
          });
        }
      }
    }

    return statements.sort((a, b) => {
      const aName = languageLookup.get(a.target)?.name ?? a.target;
      const bName = languageLookup.get(b.target)?.name ?? b.target;
      return aName.localeCompare(bName);
    });
  });

  const statusColor = (op: KCOpEntry) => {
    return getPolytimeFlag(op.polytime).color;
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
</script>

<div class="content-wrapper">
  <div class="scrollable-content">
    {#if selectedLanguage}
      <div class="language-details">
        <h3 class="text-xl font-bold text-gray-900 mb-2">{selectedLanguage.name}</h3>
        <h4 class="text-sm text-gray-600 mb-4">{selectedLanguage.fullName}</h4>
        
        <p class="text-gray-700 mb-6">
          {selectedLanguage.description}{#if selectedLanguage.descriptionRefs?.length}{#each selectedLanguage.descriptionRefs as refId}<button 
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
                  <span class="inline-block w-3 h-3 rounded-full mt-[2px] shrink-0" style={`background:${statusColor(q)}`}></span>
                  <div class="text-sm leading-5">
                    <div>
                      <strong>{q.code}</strong>{q.label ? ` (${q.label})` : ''}{#if q.refs?.length}{#each q.refs as refId}<button 
                            class="ref-badge"
                            onclick={scrollToReferences}
                            title="View reference"
                          >[{getRefNumber(refId)}]</button>{/each}{:else}<span class="missing-ref" title="Missing reference">[missing ref]</span>{/if}
                    </div>
                    {#if q.note}
                      <div class="text-xs text-gray-500">{q.note}</div>
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
                  <span class="inline-block w-3 h-3 rounded-full mt-[2px] shrink-0" style={`background:${statusColor(t)}`}></span>
                  <div class="text-sm leading-5">
                    <div>
                      <strong>{t.code}</strong>{t.label ? ` (${t.label})` : ''}{#if t.refs?.length}{#each t.refs as refId}<button 
                            class="ref-badge"
                            onclick={scrollToReferences}
                            title="View reference"
                          >[{getRefNumber(refId)}]</button>{/each}{:else}<span class="missing-ref" title="Missing reference">[missing ref]</span>{/if}
                    </div>
                    {#if t.note}
                      <div class="text-xs text-gray-500">{t.note}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
        
        {#if languageRelationships.length}
          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h5 class="font-semibold text-gray-900 mb-2">Relationships</h5>
            <div class="space-y-1 text-sm">
              {#each languageRelationships as statement}
                <div class="flex items-start gap-2">
                  <div class="flex-1 text-gray-700">
                    {statement.text}
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
          <p class="text-xs text-gray-500 mt-3">Click on other nodes to explore different knowledge compilation languages.</p>
        </div>
      </div>
    {:else}
      <div class="welcome-message">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Knowledge Compilation Map</h3>
        <p class="text-gray-600 text-sm mb-4">
          Click on a node for more detailed information.
        </p>
      </div>
    {/if}
    
    <EdgeLegend />
    
    <div class="legend-section">
      <h5>Operation Complexity</h5>
      {#each Object.values(POLYTIME_COMPLEXITIES) as complexity}
        <div class="legend-row">
          <span class="dot" style="background: {complexity.color}"></span>
          <span title={complexity.description}>{complexity.label}</span>
        </div>
      {/each}
    </div>
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
    
    .legend-section {
      margin-bottom: 0.75rem;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      background: #ffffff;
      margin-top: 1rem;
    }
    .legend-section:last-child {
      margin-bottom: 0;
    }
    .legend-section h5 {
      margin: 0 0 0.5rem 0;
      font-weight: 500;
      font-size: 0.8rem;
      color: #374151;
    }
    .legend-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #374151;
      margin-bottom: 0.25rem;
    }
    .legend-row:last-child {
      margin-bottom: 0;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  </style>