<script lang="ts">
  import type { TransformationStatus } from '$lib/types.js';

  type Language = {
    id: string;
    name: string;
  };

  type SeparatingFunction = {
    shortName: string;
    name: string;
    description: string;
    refs: string[];
  };

  type Relationship = {
    sourceId: string;
    targetId: string;
    status: TransformationStatus;
    refs: string[];
    separatingFunctions?: SeparatingFunction[];
  };

  type BaselineRelationship = {
    status: TransformationStatus;
    refs: string[];
    separatingFunctions: SeparatingFunction[];
  };

  type StatusOption = {
    value: TransformationStatus;
    label: string;
    description: string;
  };

  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relationship: Relationship) => void;
    languages: Language[];
    statusOptions: StatusOption[];
    availableRefs?: string[];
    baselineRelations?: Map<string, BaselineRelationship>; // key is "sourceId->targetId"
  };

  let { 
    isOpen = $bindable(false), 
    onClose, 
    onSave, 
    languages, 
    statusOptions, 
    availableRefs = [],
    baselineRelations = new Map()
  }: Props = $props();

  let sourceId = $state('');
  let targetId = $state('');
  let status = $state<TransformationStatus | ''>('');
  let selectedRefs = $state<string[]>([]);
  let separatingFunctions = $state<SeparatingFunction[]>([]);

  // Auto-populate when source and target are selected
  $effect(() => {
    if (sourceId && targetId && sourceId !== targetId) {
      const key = `${sourceId}->${targetId}`;
      const baseline = baselineRelations.get(key);
      
      if (baseline) {
        // Relationship exists - populate with existing data
        status = baseline.status;
        selectedRefs = [...baseline.refs];
        separatingFunctions = baseline.separatingFunctions.map(sf => ({ ...sf }));
      }
      // If no baseline exists, keep current values (defaults)
    }
  });

  function resetForm() {
    sourceId = '';
    targetId = '';
    status = '';
    selectedRefs = [];
    separatingFunctions = [];
  }

  function handleSubmit() {
    if (!sourceId || !targetId || !status || sourceId === targetId) return;
    
    onSave({
      sourceId,
      targetId,
      status,
      refs: selectedRefs,
      separatingFunctions: separatingFunctions.length > 0 ? separatingFunctions : undefined
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

  function addSeparatingFunction() {
    separatingFunctions = [...separatingFunctions, { shortName: '', name: '', description: '', refs: [] }];
  }

  function removeSeparatingFunction(index: number) {
    separatingFunctions = separatingFunctions.filter((_, i) => i !== index);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick={handleCancel}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 sticky top-0 z-10">
        <h2 class="text-2xl font-bold text-white">Manage Relationship</h2>
        <p class="text-blue-100 mt-1">Add or update transformation relationships</p>
      </div>

      <div class="p-6 space-y-4">
        <!-- Source and Target -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="rel-source" class="block text-sm font-medium text-gray-700 mb-1">
              Source Language <span class="text-red-500">*</span>
            </label>
            <select
              id="rel-source"
              bind:value={sourceId}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select source...</option>
              {#each languages as lang}
                <option value={lang.id}>{lang.name} ({lang.id})</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="rel-target" class="block text-sm font-medium text-gray-700 mb-1">
              Target Language <span class="text-red-500">*</span>
            </label>
            <select
              id="rel-target"
              bind:value={targetId}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select target...</option>
              {#each languages as lang}
                <option value={lang.id} disabled={lang.id === sourceId}>{lang.name} ({lang.id})</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Status -->
        <div>
          <label for="rel-status" class="block text-sm font-medium text-gray-700 mb-1">
            Classification <span class="text-red-500">*</span>
          </label>
          <select
            id="rel-status"
            bind:value={status}
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select classification...</option>
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          {#if status}
            {@const selectedOption = statusOptions.find(o => o.value === status)}
            {#if selectedOption}
              <p class="text-xs text-gray-500 mt-1">{selectedOption.description}</p>
            {/if}
          {/if}
        </div>

        <!-- References -->
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
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {refId}
                </button>
              {/each}
            </div>
          </fieldset>
        {/if}

        <!-- Separating Functions -->
        <fieldset class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <legend class="block text-sm font-medium text-gray-700">
              Separating Functions (optional)
            </legend>
            <button
              type="button"
              onclick={addSeparatingFunction}
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Function
            </button>
          </div>

          {#if separatingFunctions.length > 0}
            <div class="space-y-3">
              {#each separatingFunctions as func, index}
                <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      bind:value={func.shortName}
                      placeholder="Short name (e.g., 'Clique')"
                      class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onclick={() => removeSeparatingFunction(index)}
                      class="text-red-600 hover:text-red-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    bind:value={func.name}
                    placeholder="Full name (e.g., 'Clique Detection Instances')"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <textarea
                    bind:value={func.description}
                    placeholder="Description..."
                    rows="2"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-500 italic">No separating functions added yet.</p>
          {/if}
        </fieldset>

        <!-- Actions -->
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
            disabled={!sourceId || !targetId || !status || sourceId === targetId}
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Save Relationship
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
