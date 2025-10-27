<script lang="ts">
  let {
    bibtexContent,
    index,
    expanded = $bindable(false),
    onDelete
  }: {
    bibtexContent: string;
    index: number;
    expanded?: boolean;
    onDelete: () => void;
  } = $props();
</script>

<div class="border-2 border-purple-300 bg-purple-50 rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-purple-800">REF:</span>
      <span class="text-sm text-gray-900">new-{index}</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => expanded = !expanded}
        class="text-purple-700 hover:text-purple-900 font-bold text-lg"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? '∨' : '^'}
      </button>
      <button
        type="button"
        onclick={onDelete}
        class="text-red-600 hover:text-red-800 font-bold"
        aria-label="Delete"
      >
        ×
      </button>
    </div>
  </div>
  
  {#if expanded}
    <div class="mt-4 pt-4 border-t border-purple-200">
      <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto">{bibtexContent}</pre>
    </div>
  {/if}
</div>
