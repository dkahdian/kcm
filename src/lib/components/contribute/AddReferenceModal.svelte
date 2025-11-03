<script lang="ts">
  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (bibtex: string) => void;
    initialValue?: string;
    isEditMode?: boolean;
  };

  let { isOpen = $bindable(false), onClose, onAdd, initialValue = '', isEditMode = false }: Props = $props();

  let bibtexInput = $state(initialValue);

  // Update bibtexInput when initialValue changes (for edit mode)
  $effect(() => {
    if (isOpen && initialValue) {
      bibtexInput = initialValue;
    }
  });

  const bibtexPlaceholder = `@article{Darwiche_2002,
  title={A Knowledge Compilation Map},
  author={Darwiche, Adnan and Marquis, Pierre},
  journal={Journal of AI Research},
  year={2002}
}`;

  function handleSubmit() {
    if (!bibtexInput.trim()) return;
    onAdd(bibtexInput.trim());
    bibtexInput = '';
    isOpen = false;
  }

  function handleCancel() {
    if (!isEditMode) {
      bibtexInput = '';
    }
    onClose();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick={handleCancel}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <div class="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <h2 class="text-2xl font-bold text-white">{isEditMode ? 'Edit Reference' : 'Add New Reference'}</h2>
        <p class="text-purple-100 mt-1">{isEditMode ? 'Update BibTeX citation' : 'Paste BibTeX citation'}</p>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label for="bibtex-input" class="block text-sm font-medium text-gray-700 mb-2">
            BibTeX Entry <span class="text-red-500">*</span>
          </label>
          <textarea
            id="bibtex-input"
            bind:value={bibtexInput}
            placeholder={bibtexPlaceholder}
            rows="8"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            Paste a complete BibTeX entry.
          </p>
        </div>

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
            disabled={!bibtexInput.trim()}
            class="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isEditMode ? 'Update Reference' : 'Add Reference'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
