<script lang="ts">
  /**
   * Generic queue item component that can display any type of contribution item
   */
  import MathText from '$lib/components/MathText.svelte';

  let {
    type,
    title,
    subtitle,
    colorScheme = 'purple',
    index,
    isExpanded = false,
    onToggleExpand,
    onEdit,
    onDelete,
    children,
    renderMathTitle = true,
    renderMathSubtitle = true
  }: {
    type: string;
    title: string;
    subtitle?: string;
    colorScheme?: 'purple' | 'orange' | 'green' | 'yellow' | 'blue';
    index: number;
    isExpanded?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    children?: import('svelte').Snippet;
    renderMathTitle?: boolean;
    renderMathSubtitle?: boolean;
  } = $props();

  const colorMap = {
    purple: {
      border: 'border-purple-300',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      button: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300',
      divider: 'border-purple-200'
    },
    orange: {
      border: 'border-orange-300',
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      button: 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300',
      divider: 'border-orange-200'
    },
    green: {
      border: 'border-green-300',
      bg: 'bg-green-50',
      text: 'text-green-800',
      button: 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300',
      divider: 'border-green-200'
    },
    yellow: {
      border: 'border-yellow-300',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300',
      divider: 'border-yellow-200'
    },
    blue: {
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      button: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300',
      divider: 'border-blue-200'
    }
  };

  const colors = colorMap[colorScheme];
</script>

<div class="border-2 {colors.border} {colors.bg} rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold {colors.text}">{type}:</span>
      {#if renderMathTitle}
        <MathText text={title} className="text-sm font-bold text-gray-900" />
      {:else}
        <span class="text-sm font-bold text-gray-900">{title}</span>
      {/if}
      {#if subtitle}
        <span class="text-sm text-gray-600">
          (
          {#if renderMathSubtitle}
            <MathText text={subtitle} className="inline" />
          {:else}
            {subtitle}
          {/if}
          )
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => onToggleExpand(index)}
        class="px-2 py-1 text-xs {colors.button} rounded border"
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
    <div class="mt-4 pt-4 border-t {colors.divider}">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>
