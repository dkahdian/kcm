<script lang="ts">
  /**
   * Display a single queued reference
   */
  let {
    reference,
    index,
    isExpanded = false,
    onToggleExpand,
    onEdit,
    onDelete
  }: {
    reference: string;
    index: number;
    isExpanded?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
  } = $props();
</script>

<div class="border-2 border-purple-300 bg-purple-50 rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-purple-800">Reference</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => onToggleExpand(index)}
        class="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      <button
        type="button"
        onclick={() => onEdit(index)}
        class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
        aria-label="Edit"
      >
        Edit
      </button>
      <button
        type="button"
        onclick={() => onDelete(index)}
        class="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300"
        aria-label="Delete"
      >
        Delete
      </button>
    </div>
  </div>
  
  {#if isExpanded}
    <div class="mt-4 pt-4 border-t border-purple-200">
      <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto">{reference}</pre>
    </div>
  {/if}
</div>
