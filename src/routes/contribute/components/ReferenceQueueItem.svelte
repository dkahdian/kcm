<script lang="ts">
  import GenericQueueItem from './GenericQueueItem.svelte';
  import { generateReferenceId } from '$lib/utils/reference-id.js';
  import type { ReferenceToAdd } from '../types.js';

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
    reference: ReferenceToAdd;
    index: number;
    existingReferenceIds?: string[];
    isExpanded?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
  } = $props();

  const generatedId = generateReferenceId(reference.bibtex, new Set(existingReferenceIds));
</script>

<GenericQueueItem
  type="Reference"
  title={generatedId}
  subtitle={reference.title.slice(0, 60) + (reference.title.length > 60 ? '...' : '')}
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
      <div>
        <div class="font-semibold text-gray-700 mb-1">Display Title:</div>
        <div class="bg-white p-2 rounded border text-gray-900">{reference.title}</div>
      </div>
      {#if reference.href && reference.href !== '#'}
        <div>
          <div class="font-semibold text-gray-700 mb-1">URL:</div>
          <div class="bg-white p-2 rounded border">
            <a href={reference.href} target="_blank" rel="noreferrer noopener" class="text-blue-600 hover:underline break-all">
              {reference.href}
            </a>
          </div>
        </div>
      {/if}
      <details>
        <summary class="font-semibold text-gray-700 mb-1 cursor-pointer hover:text-gray-900">Raw BibTeX</summary>
        <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto whitespace-pre-wrap mt-1">{reference.bibtex}</pre>
      </details>
    </div>
  {/snippet}
</GenericQueueItem>
