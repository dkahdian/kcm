<script lang="ts">
  type SeparatingFunction = {
    shortName: string;
    name: string;
    description: string;
    refs: string[];
  };

  let {
    separatingFunction,
    index,
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete
  }: {
    separatingFunction: SeparatingFunction;
    index: number;
    isExpanded: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
  } = $props();
</script>

<div class="border-2 border-orange-300 bg-orange-50 rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-orange-800">SF:</span>
      <span class="text-sm font-bold text-gray-900">{separatingFunction.shortName}</span>
      <span class="text-sm text-gray-600">({separatingFunction.name})</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => onToggleExpand(index)}
        class="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded border border-orange-300"
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
    <div class="mt-4 pt-4 border-t border-orange-200 space-y-2">
      <div>
        <span class="text-xs font-semibold text-gray-700">Short Name:</span>
        <span class="text-xs text-gray-900 ml-2">{separatingFunction.shortName}</span>
      </div>
      <div>
        <span class="text-xs font-semibold text-gray-700">Full Name:</span>
        <span class="text-xs text-gray-900 ml-2">{separatingFunction.name}</span>
      </div>
      {#if separatingFunction.description}
        <div>
          <span class="text-xs font-semibold text-gray-700">Description:</span>
          <p class="text-xs text-gray-700 mt-1">{separatingFunction.description}</p>
        </div>
      {/if}
      {#if separatingFunction.refs && separatingFunction.refs.length > 0}
        <div>
          <span class="text-xs font-semibold text-gray-700">References:</span>
          <span class="text-xs text-gray-600 ml-2">{separatingFunction.refs.join(', ')}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
