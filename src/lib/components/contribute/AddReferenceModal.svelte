<script lang="ts">
  import { parseBibtex } from '$lib/data/references.js';
  import type { ReferenceToAdd } from '../../../routes/contribute/types.js';

  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (ref: ReferenceToAdd) => void;
    initialValue?: ReferenceToAdd;
    isEditMode?: boolean;
  };

  let { isOpen = false, onClose, onAdd, initialValue, isEditMode = false }: Props = $props();

  let bibtexInput = $state(initialValue?.bibtex ?? '');
  let titleInput = $state(initialValue?.title ?? '');
  let hrefInput = $state(initialValue?.href ?? '');
  let showAdvanced = $state(false);

  // Update inputs when initialValue changes (for edit mode)
  $effect(() => {
    if (isOpen && initialValue) {
      bibtexInput = initialValue.bibtex;
      titleInput = initialValue.title;
      hrefInput = initialValue.href;
    }
  });

  // Parse bibtex and update preview when it changes
  const parsedPreview = $derived.by(() => {
    if (!bibtexInput.trim()) return null;
    try {
      return parseBibtex(bibtexInput);
    } catch {
      return null;
    }
  });

  // Auto-fill title and href from parsed bibtex if not in advanced mode
  $effect(() => {
    if (parsedPreview && !showAdvanced) {
      titleInput = parsedPreview.title;
      hrefInput = parsedPreview.href;
    }
  });

  const bibtexPlaceholder = `@article{Darwiche_2002,
  title={A Knowledge Compilation Map},
  author={Darwiche, Adnan and Marquis, Pierre},
  journal={Journal of AI Research},
  year={2002}
}`;

  function handleSubmit() {
    if (!bibtexInput.trim() || !titleInput.trim()) return;
    onAdd({
      bibtex: bibtexInput.trim(),
      title: titleInput.trim(),
      href: hrefInput.trim() || '#'
    });
    resetForm();
    onClose();
  }

  function resetForm() {
    bibtexInput = '';
    titleInput = '';
    hrefInput = '';
    showAdvanced = false;
  }

  function handleCancel() {
    if (!isEditMode) {
      resetForm();
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
        <p class="text-purple-100 mt-1">{isEditMode ? 'Update citation details' : 'Paste BibTeX citation'}</p>
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
            rows="6"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            Paste a complete BibTeX entry.
          </p>
        </div>

        {#if parsedPreview}
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-semibold text-gray-700">Preview</h4>
              <button
                type="button"
                onclick={() => showAdvanced = !showAdvanced}
                class="text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                {showAdvanced ? 'Hide' : 'Edit'} details
              </button>
            </div>
            
            {#if showAdvanced}
              <div class="space-y-3">
                <div>
                  <label for="title-input" class="block text-xs font-medium text-gray-600 mb-1">
                    Display Title (IEEE format)
                  </label>
                  <textarea
                    id="title-input"
                    bind:value={titleInput}
                    rows="2"
                    class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  ></textarea>
                </div>
                <div>
                  <label for="href-input" class="block text-xs font-medium text-gray-600 mb-1">
                    URL
                  </label>
                  <input
                    id="href-input"
                    type="url"
                    bind:value={hrefInput}
                    placeholder="https://..."
                    class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            {:else}
              <p class="text-sm text-gray-800">{titleInput || parsedPreview.title}</p>
              {#if hrefInput && hrefInput !== '#'}
                <a href={hrefInput} target="_blank" rel="noreferrer noopener" class="text-xs text-blue-600 hover:underline mt-1 block truncate">
                  {hrefInput}
                </a>
              {/if}
            {/if}
          </div>
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
            disabled={!bibtexInput.trim() || !titleInput.trim()}
            class="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isEditMode ? 'Update Reference' : 'Add Reference'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
