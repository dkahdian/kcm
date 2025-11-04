<script lang="ts">
  import type { LanguageToAdd } from '../types.js';

  /**
   * Display a single queued language (for add or edit)
   */
  let {
    language,
    index,
    isExpanded = false,
    isEdit = false,
    onToggleExpand,
    onEdit,
    onDelete
  }: {
    language: LanguageToAdd;
    index: number;
    isExpanded?: boolean;
    isEdit?: boolean;
    onToggleExpand: (index: number) => void;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
  } = $props();

  const borderColor = isEdit ? 'border-yellow-300' : 'border-green-300';
  const bgColor = isEdit ? 'bg-yellow-50' : 'bg-green-50';
  const labelColor = isEdit ? 'text-yellow-800' : 'text-green-800';
  const buttonBg = isEdit ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-green-100 hover:bg-green-200';
  const buttonText = isEdit ? 'text-yellow-800' : 'text-green-800';
  const buttonBorder = isEdit ? 'border-yellow-300' : 'border-green-300';
  const borderTopColor = isEdit ? 'border-yellow-200' : 'border-green-200';
</script>

<div class="border-2 {borderColor} {bgColor} rounded-lg p-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold {labelColor}">
        {isEdit ? 'Edit Language:' : 'New Language:'}
      </span>
      <span class="text-sm text-gray-900">{language.name}</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => onToggleExpand(index)}
        class="px-2 py-1 text-xs {buttonBg} {buttonText} rounded border {buttonBorder}"
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
    <div class="mt-4 pt-4 border-t {borderTopColor} space-y-3 text-xs">
      <div>
        <div class="font-semibold text-gray-700 mb-1">Full Name:</div>
        <div class="text-gray-900">{language.fullName}</div>
      </div>
      <div>
        <div class="font-semibold text-gray-700 mb-1">Description:</div>
        <div class="text-gray-900">{language.description}</div>
      </div>
      {#if language.queries && Object.keys(language.queries).length > 0}
        <div>
          <div class="font-semibold text-gray-700 mb-1">
            Query Support ({Object.keys(language.queries).length}):
          </div>
          <div class="grid grid-cols-2 gap-2">
            {#each Object.entries(language.queries) as [code, support]}
              <div class="bg-white p-2 rounded border">
                <div class="font-medium">{code}</div>
                <div class="text-gray-600">{support.polytime}</div>
                {#if support.note}
                  <div class="text-gray-500 italic">{support.note}</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if language.transformations && Object.keys(language.transformations).length > 0}
        <div>
          <div class="font-semibold text-gray-700 mb-1">
            Transformation Support ({Object.keys(language.transformations).length}):
          </div>
          <div class="grid grid-cols-2 gap-2">
            {#each Object.entries(language.transformations) as [code, support]}
              <div class="bg-white p-2 rounded border">
                <div class="font-medium">{code}</div>
                <div class="text-gray-600">{support.polytime}</div>
                {#if support.note}
                  <div class="text-gray-500 italic">{support.note}</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if language.tags && language.tags.length > 0}
        <div>
          <div class="font-semibold text-gray-700 mb-1">Tags:</div>
          <div class="flex flex-wrap gap-1">
            {#each language.tags as tag}
              <span
                class="px-2 py-1 rounded text-white text-xs"
                style="background-color: {tag.color}"
              >
                {tag.label}
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
