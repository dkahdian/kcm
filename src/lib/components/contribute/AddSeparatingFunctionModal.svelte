<script lang="ts">
  import type { ReferenceForTooltip } from '../../../routes/contribute/logic.js';

  type SeparatingFunctionData = {
    shortName: string;
    name: string;
    description: string;
    refs: string[];
  };

  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (sf: SeparatingFunctionData) => void;
    availableRefs?: ReferenceForTooltip[];
    initialValue?: SeparatingFunctionData;
    isEditMode?: boolean;
  };

  let { 
    isOpen = false, 
    onClose, 
    onAdd, 
    availableRefs = [],
    initialValue,
    isEditMode = false 
  }: Props = $props();

  let shortName = $state('');
  let name = $state('');
  let description = $state('');
  let selectedRefs = $state<string[]>([]);

  // Update form when initialValue changes (for edit mode)
  $effect(() => {
    if (isOpen && initialValue) {
      shortName = initialValue.shortName;
      name = initialValue.name;
      description = initialValue.description;
      selectedRefs = [...initialValue.refs];
    }
  });

  function resetForm() {
    shortName = '';
    name = '';
    description = '';
    selectedRefs = [];
  }

  function handleSubmit() {
    if (!shortName.trim() || !name.trim()) return;
    
    onAdd({
      shortName: shortName.trim(),
      name: name.trim(),
      description: description.trim(),
      refs: selectedRefs
    });
    
    if (!isEditMode) {
      resetForm();
    }
    onClose();
  }

  function handleCancel() {
    if (!isEditMode) {
      resetForm();
    }
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
      <div class="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
        <h2 class="text-2xl font-bold text-white">{isEditMode ? 'Edit Separating Function' : 'Add New Separating Function'}</h2>
        <p class="text-orange-100 mt-1">{isEditMode ? 'Update separating function details' : 'Define a new separating function'}</p>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label for="sf-shortName" class="block text-sm font-medium text-gray-700 mb-2">
            Short Name <span class="text-red-500">*</span>
          </label>
          <input
            id="sf-shortName"
            type="text"
            bind:value={shortName}
            placeholder="e.g., Clique"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Brief label displayed on edges (e.g., "Clique", "PI")
          </p>
        </div>

        <div>
          <label for="sf-name" class="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span class="text-red-500">*</span>
          </label>
          <input
            id="sf-name"
            type="text"
            bind:value={name}
            placeholder="e.g., Clique Detection Instances"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Full human-readable name
          </p>
        </div>

        <div>
          <label for="sf-description" class="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="sf-description"
            bind:value={description}
            rows="3"
            placeholder="Describe what this function separates..."
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y"
          ></textarea>
        </div>

        {#if availableRefs.length > 0}
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">References</legend>
            <div class="flex flex-wrap gap-2">
              {#each availableRefs as ref}
                <button
                  type="button"
                  onclick={() => toggleRef(ref.id)}
                  class={`px-3 py-1 text-sm rounded-lg border-2 transition-colors ${
                    selectedRefs.includes(ref.id)
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300'
                  }`}
                  title={ref.title}
                >
                  {ref.id}
                </button>
              {/each}
            </div>
          </fieldset>
        {/if}

        <div class="flex gap-3 justify-end pt-4">
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
            disabled={!shortName.trim() || !name.trim()}
            class="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isEditMode ? 'Update Function' : 'Add Function'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
