<script lang="ts">
  type Tag = {
    id: string;
    label: string;
    color: string;
    description?: string;
    refs: string[];
  };

  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (tag: Tag) => void;
    availableRefs?: string[];
  };

  let { isOpen = $bindable(false), onClose, onAdd, availableRefs = [] }: Props = $props();

  let tagId = $state('');
  let tagLabel = $state('');
  let tagColor = $state('#3b82f6');
  let tagDescription = $state('');
  let selectedRefs = $state<string[]>([]);

  function resetForm() {
    tagId = '';
    tagLabel = '';
    tagColor = '#3b82f6';
    tagDescription = '';
    selectedRefs = [];
  }

  function handleSubmit() {
    if (!tagId.trim() || !tagLabel.trim()) return;
    
    onAdd({
      id: tagId.trim(),
      label: tagLabel.trim(),
      color: tagColor,
      description: tagDescription.trim() || undefined,
      refs: selectedRefs
    });
    
    resetForm();
    isOpen = false;
  }

  function handleCancel() {
    resetForm();
    onClose();
  }

  function toggleRef(refId: string) {
    if (selectedRefs.includes(refId)) {
      selectedRefs = selectedRefs.filter(r => r !== refId);
    } else {
      selectedRefs = [...selectedRefs, refId];
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick={handleCancel}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <div class="bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4">
        <h2 class="text-2xl font-bold text-white">Add New Tag</h2>
        <p class="text-pink-100 mt-1">Create a custom tag for languages</p>
      </div>

      <div class="p-6 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="tag-id" class="block text-sm font-medium text-gray-700 mb-1">
              Tag ID <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="tag-id"
              bind:value={tagId}
              placeholder="e.g., 'probabilistic'"
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label for="tag-label" class="block text-sm font-medium text-gray-700 mb-1">
              Display Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="tag-label"
              bind:value={tagLabel}
              placeholder="e.g., 'Probabilistic'"
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>

        <div>
          <label for="tag-color" class="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <div class="flex items-center gap-3">
            <input
              type="color"
              id="tag-color"
              bind:value={tagColor}
              class="h-10 w-20 border-2 border-gray-300 rounded-lg cursor-pointer"
            />
            <span class="text-sm text-gray-600">{tagColor}</span>
            <div 
              class="px-3 py-1 rounded-full text-white text-sm font-medium"
              style="background-color: {tagColor}"
            >
              Preview
            </div>
          </div>
        </div>

        <div>
          <label for="tag-description" class="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="tag-description"
            bind:value={tagDescription}
            placeholder="Brief description of this tag..."
            rows="3"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          ></textarea>
        </div>

        {#if availableRefs.length > 0}
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">References</legend>
            <div class="flex flex-wrap gap-2">
              {#each availableRefs as refId}
                <button
                  type="button"
                  onclick={() => toggleRef(refId)}
                  class={`px-3 py-1 text-sm rounded-lg border-2 transition-colors ${
                    selectedRefs.includes(refId)
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300'
                  }`}
                >
                  {refId}
                </button>
              {/each}
            </div>
          </fieldset>
        {/if}

        <div class="flex gap-3 justify-end pt-4 border-t">
          <button
            type="button"
            onclick={handleCancel}
            class="px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={handleSubmit}
            disabled={!tagId.trim() || !tagLabel.trim()}
            class="px-4 py-2 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Add Tag
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
