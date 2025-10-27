<script lang="ts">
  import type { TransformationStatus } from '$lib/types';

  type SeparatingFunctionEntry = {
    shortName: string;
    name: string;
    description: string;
    refs: string[];
  };

  type RelationshipData = {
    sourceId: string;
    targetId: string;
    status: TransformationStatus;
    refs: string[];
    separatingFunctions?: SeparatingFunctionEntry[];
  };

  let {
    relationship,
    index,
    expanded = $bindable(false),
    onDelete
  }: {
    relationship: RelationshipData;
    index: number;
    expanded?: boolean;
    onDelete: () => void;
  } = $props();
</script>

<div class="border-2 border-blue-300 bg-blue-50 rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-blue-800">REL:</span>
      <span class="text-sm text-gray-900">{relationship.sourceId} → {relationship.targetId}</span>
      <span class="text-xs text-gray-600">({relationship.status})</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => expanded = !expanded}
        class="text-blue-700 hover:text-blue-900 font-bold text-lg"
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
    <div class="mt-4 pt-4 border-t border-blue-200 space-y-4">
      <p class="text-xs text-gray-600 italic">Relationship editing form would go here (status, refs, separating functions)</p>
      <!-- TODO: Import and use RelationshipForm component -->
    </div>
  {/if}
</div>
