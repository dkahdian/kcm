<script lang="ts">
  import MathText from './MathText.svelte';
  import DynamicLegend from './DynamicLegend.svelte';
  import type { 
    GraphData, 
    FilteredGraphData, 
    KCLanguage,
    KCOpEntry,
    SelectedOperation,
    SelectedOperationCell,
    Complexity,
    ViewMode
  } from '$lib/types.js';
  import { getComplexityFromCatalog } from '$lib/data/complexities.js';
  import { extractCitationKeys } from '$lib/utils/math-text.js';
  import { getGlobalRefNumber } from '$lib/data/references.js';

  import { QUERIES, TRANSFORMATIONS } from '$lib/data/operations.js';

  let {
    selectedOperation = null,
    selectedOperationCell = null,
    graphData,
    filteredGraphData,
    onLanguageSelect,
    onOperationSelect,
    viewMode = 'queries' as ViewMode
  }: {
    selectedOperation: SelectedOperation | null;
    selectedOperationCell: SelectedOperationCell | null;
    graphData: GraphData | FilteredGraphData;
    filteredGraphData?: GraphData | FilteredGraphData;
    onLanguageSelect?: (language: KCLanguage) => void;
    onOperationSelect?: (operation: SelectedOperation) => void;
    viewMode?: ViewMode;
  } = $props();

  const legendGraphData = $derived(filteredGraphData ?? graphData);

  const complexityCatalog = $derived(graphData.complexities);

  function getComplexity(code: string): Complexity {
    return getComplexityFromCatalog(complexityCatalog, code);
  }

  let referencesSection: HTMLElement | null = $state(null);
  let copiedRefId: string | null = $state(null);

  function handleCitationClick(_key: string) {
    referencesSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function copyBibtex(bibtex: string, refId: string) {
    try {
      await navigator.clipboard.writeText(bibtex);
      copiedRefId = refId;
      setTimeout(() => {
        copiedRefId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy BibTeX:', err);
    }
  }

  function handleLanguageClick(language: KCLanguage) {
    onLanguageSelect?.(language);
  }

  function handleOperationCodeClick(code: string, type: 'query' | 'transformation') {
    const opDefs = type === 'query' ? QUERIES : TRANSFORMATIONS;
    const opDef = Object.values(opDefs).find(op => op.code === code);
    if (opDef && onOperationSelect) {
      onOperationSelect({
        code: opDef.code,
        label: opDef.label,
        description: opDef.description,
        type
      });
    }
  }

  // Collect references for the cell view
  const cellReferences = $derived.by(() => {
    if (!selectedOperationCell) return [];

    const refIds = new Set<string>();
    const support = selectedOperationCell.support;
    
    // Add refs from the support
    support.refs?.forEach(id => refIds.add(id));
    
    // Extract inline citations from description/caveat
    if (support.description) {
      extractCitationKeys(support.description).forEach(key => refIds.add(key));
    }
    if (support.caveat) {
      extractCitationKeys(support.caveat).forEach(key => refIds.add(key));
    }
    
    // Build result from global references
    const globalRefMap = new Map(graphData.references.map(ref => [ref.id, ref]));
    const refs = [];
    
    for (const id of refIds) {
      const ref = globalRefMap.get(id);
      if (ref) {
        refs.push(ref);
      }
    }
    
    // Sort by global reference number
    refs.sort((a, b) => (getGlobalRefNumber(a.id) ?? Infinity) - (getGlobalRefNumber(b.id) ?? Infinity));
    
    return refs;
  });
</script>

<div class="content-wrapper">
  <div class="scrollable-content">
    {#if selectedOperationCell}
      <!-- Show language + operation cell info -->
      {@const complexity = getComplexity(selectedOperationCell.support.complexity)}
      <div class="operation-cell-details">
        <div class="cell-header">
          <button 
            type="button"
            class="language-link"
            onclick={() => handleLanguageClick(selectedOperationCell.language)}
            title="View language details"
          >
            <MathText text={selectedOperationCell.language.name} className="inline text-lg font-bold" />
          </button>
          <span class="separator">→</span>
          <button 
            type="button"
            class="operation-code-link"
            onclick={() => handleOperationCodeClick(selectedOperationCell.operationCode, selectedOperationCell.operationType)}
            title="View operation details"
          >{selectedOperationCell.operationCode}</button>
        </div>
        
        <div class="cell-operation-label text-sm text-gray-600 mb-4">
          {selectedOperationCell.operationLabel}
          ({selectedOperationCell.operationType})
        </div>

        <p class="text-sm text-gray-700 mb-2">
          {complexity.description}{#if selectedOperationCell.support.caveat}{' '}unless <MathText 
              text={selectedOperationCell.support.caveat} 
              className="inline"
              onCitationClick={handleCitationClick}
            />{/if}
        </p>

        {#if selectedOperationCell.support.description}
          <div class="description-section mb-4">
            <MathText 
              text={selectedOperationCell.support.description} 
              className="text-sm text-gray-700"
              onCitationClick={handleCitationClick}
            />
          </div>
        {/if}

        {#if selectedOperationCell.support.derived}
          <div class="derived-notice mb-4">
            <span class="derived-badge">Derived</span>
            <span class="text-xs text-gray-500">This was inferred from other data</span>
          </div>
        {/if}

        <div class="mt-4 pt-4 border-t border-gray-200" bind:this={referencesSection}>
          {#if cellReferences.length}
            <h6 class="text-sm font-semibold text-gray-900 mb-2">References</h6>
            <ol class="space-y-2">
              {#each cellReferences as ref}
                <li class="text-xs text-gray-700">
                  <div class="flex items-start gap-1.5">
                    <span class="font-semibold text-gray-900">[{getGlobalRefNumber(ref.id) ?? '?'}]</span>
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
          {/if}
        </div>
      </div>
    {:else if selectedOperation}
      <!-- Show operation info only -->
      <div class="operation-details">
        <div class="operation-header">
          <span class="operation-code-large">{selectedOperation.code}</span>
          <span class="operation-type-badge">{selectedOperation.type}</span>
        </div>
        
        <h4 class="text-lg font-semibold text-gray-900 mb-2">{selectedOperation.label}</h4>
        
        {#if selectedOperation.description}
          <p class="text-gray-700 mb-4">
            <MathText text={selectedOperation.description} className="inline" />
          </p>
        {/if}

        <div class="info-note">
          <p class="text-sm text-gray-500">
            Click on a cell in the matrix to see how a specific language supports this {selectedOperation.type}.
          </p>
        </div>
      </div>
    {:else}
      <div class="welcome-message">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Operations Matrix</h3>
        <p class="text-gray-600 text-sm mb-4">
          Click on a language name to see its details, an operation code to learn about it, 
          or a cell to see the complexity of that operation for that language.
        </p>
      </div>
    {/if}
    
    <DynamicLegend graphData={legendGraphData} viewMode={viewMode} />
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
  
  .operation-details, 
  .operation-cell-details,
  .welcome-message {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .cell-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .language-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #2563eb;
    text-decoration: none;
  }

  .language-link:hover {
    text-decoration: underline;
  }

  .separator {
    color: #9ca3af;
    font-size: 1.25rem;
  }

  .operation-code-link {
    font-family: monospace;
    font-size: 1.25rem;
    font-weight: 700;
    color: #2563eb;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: none;
  }

  .operation-code-link:hover {
    text-decoration: underline;
  }

  .operation-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .operation-code-large {
    font-family: monospace;
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    background: #f3f4f6;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
  }

  .operation-type-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #6366f1;
    background: #eef2ff;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .derived-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .derived-badge {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #6b7280;
    background: #e5e7eb;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
  }

  .info-note {
    padding: 0.75rem;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 0.375rem;
  }
</style>
