<script lang="ts">
  import GenericQueueItem from './GenericQueueItem.svelte';

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

<GenericQueueItem
  type="SF"
  title={separatingFunction.shortName}
  subtitle={separatingFunction.name}
  colorScheme="orange"
  {index}
  {isExpanded}
  {onToggleExpand}
  {onEdit}
  {onDelete}
>
  {#snippet children()}
    <div class="space-y-2">
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
  {/snippet}
</GenericQueueItem>
