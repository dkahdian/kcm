<script lang="ts">
  import type { PolytimeFlagCode } from '$lib/types';

  type LanguageData = {
    id: string;
    name: string;
    fullName: string;
    description: string;
    descriptionRefs: string[];
    queries: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
    transformations: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
    tags: Array<{ id: string; label: string; color: string; description?: string; refs: string[] }>;
    existingReferences: string[];
  };

  let {
    language,
    index,
    isEdit = false,
    expanded = $bindable(false),
    onDelete
  }: {
    language: LanguageData;
    index: number;
    isEdit?: boolean;
    expanded?: boolean;
    onDelete: () => void;
  } = $props();

  const borderColor = isEdit ? 'border-yellow-300' : 'border-green-300';
  const bgColor = isEdit ? 'bg-yellow-50' : 'bg-green-50';
  const textColor = isEdit ? 'text-yellow-800' : 'text-green-800';
  const buttonColor = isEdit ? 'text-yellow-700 hover:text-yellow-900' : 'text-green-700 hover:text-green-900';
  const dividerColor = isEdit ? 'border-yellow-200' : 'border-green-200';
</script>

<div class="border-2 {borderColor} {bgColor} rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold {textColor}">
        {isEdit ? 'EDIT LANG:' : 'NEW LANG:'}
      </span>
      <span class="text-sm text-gray-900">{language.name} ({language.id})</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => expanded = !expanded}
        class="{buttonColor} font-bold text-lg"
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
    <div class="mt-4 pt-4 border-t {dividerColor} space-y-4">
      <p class="text-xs text-gray-600 italic">Full language form would go here (all queries, transformations, tags, etc.)</p>
      <!-- TODO: Import and use LanguageForm component -->
    </div>
  {/if}
</div>
