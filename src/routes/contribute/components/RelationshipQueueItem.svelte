<script lang="ts">
  import type { RelationshipEntry } from '../types.js';
  import { relationKey } from '../logic.js';

  /**
   * Display a single queued relationship
   */
  let {
    relationship,
    index,
    isExpanded = false,
    isModified = false,
    onToggleExpand,
    onEdit,
    onDelete
  }: {
    relationship: RelationshipEntry;
    index: number;
    isExpanded?: boolean;
    isModified?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number, key: string) => void;
  } = $props();

  // Generate the relationship key
  const key = relationKey(relationship.sourceId, relationship.targetId);
</script>

{#if isModified}
  <div class="border-2 border-blue-300 bg-blue-50 rounded-lg p-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-blue-800">Relationship:</span>
        <span class="text-sm text-gray-900">{relationship.sourceId} → {relationship.targetId}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => onToggleExpand(index)}
          class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
        <button
          type="button"
          onclick={() => onEdit(index)}
          class="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300"
          aria-label="Edit"
        >
          Edit
        </button>
        <button
          type="button"
          onclick={() => onDelete(index, key)}
          class="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300"
          aria-label="Delete"
        >
          Delete
        </button>
      </div>
    </div>
    
    {#if isExpanded}
      <div class="mt-4 pt-4 border-t border-blue-200 space-y-3 text-xs">
        <div>
          <div class="font-semibold text-gray-700 mb-1">Transformation Status:</div>
          <div class="bg-white p-2 rounded border">
            <span class="font-mono text-gray-900">{relationship.status}</span>
          </div>
        </div>
        {#if relationship.separatingFunctions && relationship.separatingFunctions.length > 0}
          <div>
            <div class="font-semibold text-gray-700 mb-1">
              Separating Functions ({relationship.separatingFunctions.length}):
            </div>
            <div class="space-y-2">
              {#each relationship.separatingFunctions as fn}
                <div class="bg-white p-2 rounded border">
                  <div class="font-medium">{fn.name}</div>
                  <div class="text-gray-600 text-xs">Short: {fn.shortName}</div>
                  <div class="text-gray-500 italic text-xs">{fn.description}</div>
                  {#if fn.refs && fn.refs.length > 0}
                    <div class="text-gray-500 text-xs mt-1">Refs: [{fn.refs.join(', ')}]</div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if relationship.refs && relationship.refs.length > 0}
          <div>
            <div class="font-semibold text-gray-700 mb-1">References:</div>
            <div class="text-gray-600">{relationship.refs.join(', ')}</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
