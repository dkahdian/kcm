<script lang="ts">
  import GenericQueueItem from './GenericQueueItem.svelte';

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

<GenericQueueItem
  type="Reference"
  title="new-{index}"
  colorScheme="purple"
  {index}
  {isExpanded}
  {onToggleExpand}
  {onEdit}
  {onDelete}
>
  {#snippet children()}
    <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto">{reference}</pre>
  {/snippet}
</GenericQueueItem>
