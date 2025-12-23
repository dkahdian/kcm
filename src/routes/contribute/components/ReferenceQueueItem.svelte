<script lang="ts">
  import GenericQueueItem from './GenericQueueItem.svelte';
  import { generateReferenceId } from '$lib/utils/reference-id.js';

  /**
   * Extract common fields from BibTeX string for display
   */
  function parseBibtexFields(bibtex: string): { title?: string; author?: string; year?: string; type?: string } {
    const result: { title?: string; author?: string; year?: string; type?: string } = {};
    
    // Extract entry type
    const typeMatch = bibtex.match(/@(\w+)\s*\{/);
    if (typeMatch) {
      result.type = typeMatch[1].toLowerCase();
    }
    
    // Extract title
    const titleMatch = bibtex.match(/title\s*=\s*[{"]([^}"]+)[}"]/i);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/[{}]/g, '');
    }
    
    // Extract author
    const authorMatch = bibtex.match(/author\s*=\s*[{"]([^}"]+)[}"]/i);
    if (authorMatch) {
      result.author = authorMatch[1].replace(/[{}]/g, '');
    }
    
    // Extract year
    const yearMatch = bibtex.match(/year\s*=\s*[{"]?(\d{4})[}"]?/i);
    if (yearMatch) {
      result.year = yearMatch[1];
    }
    
    return result;
  }

  /**
   * Display a single queued reference
   */
  let {
    reference,
    index,
    existingReferenceIds = [],
    isExpanded = false,
    onToggleExpand,
    onEdit,
    onDelete
  }: {
    reference: string;
    index: number;
    existingReferenceIds?: string[];
    isExpanded?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
  } = $props();

  const parsed = parseBibtexFields(reference);
  const generatedId = generateReferenceId(reference, new Set(existingReferenceIds));
</script>

<GenericQueueItem
  type="Reference"
  title={generatedId}
  subtitle={parsed.title || 'BibTeX entry'}
  renderMathTitle={false}
  renderMathSubtitle={false}
  colorScheme="purple"
  {index}
  {isExpanded}
  {onToggleExpand}
  {onEdit}
  {onDelete}
>
  {#snippet children()}
    <div class="space-y-3 text-xs">
      <div>
        <div class="font-semibold text-gray-700 mb-1">Generated ID:</div>
        <div class="bg-white p-2 rounded border">
          <span class="font-mono text-purple-700">{generatedId}</span>
        </div>
      </div>
      {#if parsed.title}
        <div>
          <div class="font-semibold text-gray-700 mb-1">Title:</div>
          <div class="bg-white p-2 rounded border text-gray-900">{parsed.title}</div>
        </div>
      {/if}
      {#if parsed.author}
        <div>
          <div class="font-semibold text-gray-700 mb-1">Author(s):</div>
          <div class="bg-white p-2 rounded border text-gray-900">{parsed.author}</div>
        </div>
      {/if}
      {#if parsed.year}
        <div>
          <div class="font-semibold text-gray-700 mb-1">Year:</div>
          <div class="bg-white p-2 rounded border text-gray-900">{parsed.year}</div>
        </div>
      {/if}
      {#if parsed.type}
        <div>
          <div class="font-semibold text-gray-700 mb-1">Entry Type:</div>
          <div class="bg-white p-2 rounded border">
            <span class="capitalize text-gray-600">{parsed.type}</span>
          </div>
        </div>
      {/if}
      <div>
        <div class="font-semibold text-gray-700 mb-1">Raw BibTeX:</div>
        <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto whitespace-pre-wrap">{reference}</pre>
      </div>
    </div>
  {/snippet}
</GenericQueueItem>
