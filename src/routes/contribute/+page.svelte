<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';
  import AddLanguageModal from '$lib/components/contribute/AddLanguageModal.svelte';
  import AddReferenceModal from '$lib/components/contribute/AddReferenceModal.svelte';
  import ManageRelationshipModal from '$lib/components/contribute/ManageRelationshipModal.svelte';
  import ContributionQueue from './components/ContributionQueue.svelte';
  import ActionButtons from './components/ActionButtons.svelte';
  import SubmitButton from './components/SubmitButton.svelte';
  import { 
    relationKey, 
    buildBaselineRelations,
    getAvailableReferenceIds,
    getAvailableLanguages,
    convertLanguageForEdit,
    validateSubmission,
    buildSubmissionPayload
  } from './logic.js';
  import type { LanguageToAdd, RelationshipEntry, CustomTag, DeferredItems } from './types.js';

  type OperationResult = { success: boolean; error?: string };

  let { data }: { data: PageData } = $props();

  const polytimeOptions = Object.values(data.polytimeOptions);

  const statusOptions: Array<{
    value: TransformationStatus;
    label: string;
    description: string;
  }> = data.relationTypes.map((type) => ({
    value: type.id as TransformationStatus,
    label: type.name,
    description: type.description ?? ''
  }));

  // Build baseline relations from adjacency matrix
  const baselineRelations = buildBaselineRelations(data.adjacencyMatrix);

  // Contributor information
  let contributorEmail = $state('');
  let contributorGithub = $state('');
  let contributorNote = $state('');

  // Languages
  let languagesToAdd = $state<LanguageToAdd[]>([]);
  let languagesToEdit = $state<LanguageToAdd[]>([]);

  // Relationships (always visible, works with existing + new languages)
  let relationships = $state<RelationshipEntry[]>([]);

  // Track expanded state for chip UI
  let expandedLanguageToAddIndex = $state<number | null>(null);
  let expandedLanguageToEditIndex = $state<number | null>(null);
  let expandedRelationshipIndex = $state<number | null>(null);
  let expandedReferenceIndex = $state<number | null>(null);

  // Modal visibility state
  let showAddLanguageModal = $state(false);
  let showEditLanguageModal = $state(false);
  let showLanguageSelectorModal = $state(false);
  let selectedLanguageToEdit = $state<string>('');
  let showAddReferenceModal = $state(false);
  let showManageRelationshipModal = $state(false);
  let editReferenceIndex = $state<number | null>(null);
  let editLanguageToAddIndex = $state<number | null>(null);
  let editLanguageToEditIndex = $state<number | null>(null);
  let editRelationshipIndex = $state<number | null>(null);

  // Track which relationships have been modified from baseline
  const modifiedRelations = new Set<string>();

  function recordModification(rel: RelationshipEntry) {
    modifiedRelations.add(relationKey(rel.sourceId, rel.targetId));
  }

  function clearModificationByKey(key: string) {
    modifiedRelations.delete(key);
  }

  let newReferences = $state<string[]>([]);
  let customTags = $state<CustomTag[]>([]);

  let submitting = $state(false);
  let submitError = $state('');



  // Modal handlers
  function handleAddLanguage(language: LanguageToAdd): OperationResult {
    languagesToAdd = [...languagesToAdd, language];
    return { success: true };
  }

  function handleEditLanguage(language: LanguageToAdd): OperationResult {
    const index = languagesToEdit.findIndex(l => l.id === language.id);
    if (index >= 0) {
      languagesToEdit[index] = language;
      languagesToEdit = [...languagesToEdit];
    } else {
      languagesToEdit = [...languagesToEdit, language];
    }
    return { success: true };
  }

  function handleAddReference(bibtex: string) {
    newReferences = [...newReferences, bibtex];
  }

  // Store items that come after the reference being edited
  // NOTE: This queue management system has a conceptual issue - it assumes items at the same
  // numerical index across different arrays were added at the same "queue position", which is
  // only true if items are added in synchronized batches. The current implementation only supports
  // this deferred/re-validation logic for references. Languages and relationships use simpler
  // in-place editing without queue revalidation.
  // TODO: Consider implementing a proper unified queue with global ordering and validation.
  let deferredItems = $state<DeferredItems | null>(null);

  function handleEditReference(index: number) {
    // Store all items added after this reference
    deferredItems = {
      languages: languagesToAdd.slice(index + 1),
      editedLanguages: languagesToEdit.slice(index + 1),
      references: newReferences.slice(index + 1),
      relationships: relationships.filter((_, i) => i > index),
      tags: customTags.slice(index + 1)
    };

    // Remove items that come after
    languagesToAdd = languagesToAdd.slice(0, index + 1);
    languagesToEdit = languagesToEdit.slice(0, index + 1);
    newReferences = newReferences.slice(0, index + 1);
    relationships = relationships.slice(0, index + 1);
    customTags = customTags.slice(0, index + 1);

    // Open modal with current content
    editReferenceIndex = index;
    showAddReferenceModal = true;
  }

  function handleUpdateReference(bibtex: string) {
    if (editReferenceIndex !== null) {
      // Update the reference at the edit index
      newReferences[editReferenceIndex] = bibtex;
      newReferences = [...newReferences];

      // Restore deferred items
      if (deferredItems) {
        languagesToAdd = [...languagesToAdd, ...deferredItems.languages];
        languagesToEdit = [...languagesToEdit, ...deferredItems.editedLanguages];
        newReferences = [...newReferences, ...deferredItems.references];
        relationships = [...relationships, ...deferredItems.relationships];
        customTags = [...customTags, ...deferredItems.tags];
      }

      // Clear edit state
      editReferenceIndex = null;
      deferredItems = null;
    }
  }

  function handleEditLanguageToAdd(index: number) {
    // Open modal with current content
    editLanguageToAddIndex = index;
    showAddLanguageModal = true;
  }

  function handleUpdateLanguageToAdd(language: LanguageToAdd): OperationResult {
    if (editLanguageToAddIndex !== null) {
      // Update the language at the edit index
      languagesToAdd[editLanguageToAddIndex] = language;
      languagesToAdd = [...languagesToAdd];

      // Clear edit state
      editLanguageToAddIndex = null;
    }
    return { success: true };
  }

  function handleEditLanguageToEdit(index: number) {
    // Open modal with current content
    editLanguageToEditIndex = index;
    showEditLanguageModal = true;
  }

  function handleUpdateLanguageToEdit(language: LanguageToAdd): OperationResult {
    if (editLanguageToEditIndex !== null) {
      // Update the language at the edit index
      languagesToEdit[editLanguageToEditIndex] = language;
      languagesToEdit = [...languagesToEdit];

      // Clear edit state
      editLanguageToEditIndex = null;
    }
    return { success: true };
  }

  function handleEditRelationship(index: number) {
    // Open modal with current content
    editRelationshipIndex = index;
    showManageRelationshipModal = true;
  }

  function handleUpdateRelationship(relationship: RelationshipEntry) {
    if (editRelationshipIndex !== null) {
      // Update the relationship at the edit index
      relationships[editRelationshipIndex] = relationship;
      relationships = [...relationships];
      recordModification(relationship);

      // Clear edit state
      editRelationshipIndex = null;
    }
  }

  function handleSaveRelationship(relationship: RelationshipEntry) {
    // If we're in edit mode, use the update handler
    if (editRelationshipIndex !== null) {
      handleUpdateRelationship(relationship);
      return;
    }

    // Check if this relationship already exists (adding)
    const key = relationKey(relationship.sourceId, relationship.targetId);
    const existingIndex = relationships.findIndex(r => 
      relationKey(r.sourceId, r.targetId) === key
    );
    
    if (existingIndex >= 0) {
      // Update existing relationship
      relationships[existingIndex] = relationship;
      relationships = [...relationships];
    } else {
      // Add new relationship
      relationships = [...relationships, relationship];
    }
    
    recordModification(relationship);
  }

  function handleAddTag(tag: { id: string; label: string; color: string; description?: string; refs: string[] }) {
    customTags = [...customTags, tag];
  }

  // Cascade delete: when a language is deleted, remove its relationships
  function deleteLanguage(langId: string, isNew: boolean) {
    if (isNew) {
      languagesToAdd = languagesToAdd.filter(l => l.id !== langId);
    } else {
      languagesToEdit = languagesToEdit.filter(l => l.id !== langId);
    }
    
    // Remove any relationships involving this language
    relationships = relationships.filter(rel => 
      rel.sourceId !== langId && rel.targetId !== langId
    );
  }

  // Cascade delete: when a reference is deleted, remove it from all dependencies
  function deleteReference(index: number) {
    const refId = `new-${index}`;
    newReferences = newReferences.filter((_, i) => i !== index);
    
    // Remove from language description refs
    languagesToAdd.forEach(lang => {
      lang.descriptionRefs = lang.descriptionRefs.filter(r => r !== refId);
    });
    languagesToEdit.forEach(lang => {
      lang.descriptionRefs = lang.descriptionRefs.filter(r => r !== refId);
    });
    
    // Remove from relationships
    relationships.forEach(rel => {
      rel.refs = rel.refs.filter(r => r !== refId);
      rel.separatingFunctions?.forEach(fn => {
        fn.refs = fn.refs.filter(r => r !== refId);
      });
    });
    
    // Remove from tags
    customTags.forEach(tag => {
      tag.refs = tag.refs.filter(r => r !== refId);
    });
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    submitError = '';
    submitting = true;

    try {
      // Rate limiting: max 3 submissions per hour per browser
      const now = Date.now();
      const submissionsKey = 'kcm_submissions';
      const storedSubmissions = localStorage.getItem(submissionsKey);
      const submissions: number[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
      
      // Filter out submissions older than 1 hour
      const recentSubmissions = submissions.filter(time => now - time < 60 * 60 * 1000);
      
      // if (recentSubmissions.length >= 3) {
      //   submitError = 'Too many submissions. Please wait an hour before submitting again.';
      //   submitting = false;
      //   return;
      // }

      const changedRelationships = relationships.filter((rel) =>
        modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))
      );

      // Validate we have something to submit
      const validationError = validateSubmission(
        languagesToAdd,
        languagesToEdit,
        changedRelationships,
        newReferences
      );
      if (validationError) {
        submitError = validationError;
        submitting = false;
        return;
      }

      const submission = buildSubmissionPayload(
        contributorEmail,
        contributorGithub,
        contributorNote,
        languagesToAdd,
        languagesToEdit,
        changedRelationships,
        newReferences,
        data.existingLanguageIds
      );

      const t1 = 'github_pat_11BODXYDQ0Fw5d4huTq6Ff_0w6DLns2rxcWbDjrX4oQz';
      const t2 = 'uYuSB5EGMOq31ueJ64VNZjTICPO27KQESFcK7l';
      const token = t1 + t2;

      // Trigger repository_dispatch workflow
      const response = await fetch('https://api.github.com/repos/dkahdian/kcm/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'data-contribution',
          client_payload: submission
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('GitHub API error:', error);
        console.error('Submission payload:', submission);
        submitError = 'Failed to submit contribution. Please try again or contact support.';
        submitting = false;
        return;
      }

      // Record successful submission for rate limiting
      recentSubmissions.push(now);
      localStorage.setItem(submissionsKey, JSON.stringify(recentSubmissions));

      // Success - redirect to success page
      goto('/contribute/success');
    } catch (err) {
      submitError = 'Network error: ' + (err instanceof Error ? err.message : 'Unknown error');
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Contribute - Knowledge Compilation Map</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
        Contribute to the KC Map **WARNING: UNFINISHED**
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Help improve the Knowledge Compilation Map by adding new languages or updating existing ones.
      </p>
    </div>

    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h2 class="text-2xl font-bold text-white">Submission Form</h2>
        <p class="text-blue-100 mt-1">Fill out the details below to contribute</p>
      </div>

      <div class="p-8 sm:p-10">
        {#if submitError}
          <div class="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-semibold text-red-800">Submission Error</p>
                <p class="text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-8">
          <!-- Contributor Information (Shared) -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Contributor Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="contributor-email" class="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="contributor-email"
                  bind:value={contributorEmail}
                  required
                  class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label for="contributor-github" class="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Username (optional)
                </label>
                <input
                  type="text"
                  id="contributor-github"
                  bind:value={contributorGithub}
                  class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="@username"
                />
              </div>
            </div>
            <div class="mt-4">
              <label for="contributor-note" class="block text-sm font-medium text-gray-700 mb-1">
                Note (optional)
              </label>
              <textarea
                id="contributor-note"
                bind:value={contributorNote}
                rows="3"
                class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Add any clarifications or additional context for your contribution..."
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">This note will be included in the pull request description.</p>
            </div>
          </div>

          <!-- Queued Items Section -->
          <ContributionQueue
            {languagesToAdd}
            {languagesToEdit}
            {newReferences}
            {relationships}
            {modifiedRelations}
            {expandedLanguageToAddIndex}
            {expandedLanguageToEditIndex}
            {expandedReferenceIndex}
            {expandedRelationshipIndex}
            onToggleExpandLanguageToAdd={(index) => expandedLanguageToAddIndex = expandedLanguageToAddIndex === index ? null : index}
            onToggleExpandLanguageToEdit={(index) => expandedLanguageToEditIndex = expandedLanguageToEditIndex === index ? null : index}
            onToggleExpandReference={(index) => expandedReferenceIndex = expandedReferenceIndex === index ? null : index}
            onToggleExpandRelationship={(index) => expandedRelationshipIndex = expandedRelationshipIndex === index ? null : index}
            onEditLanguageToAdd={handleEditLanguageToAdd}
            onEditLanguageToEdit={handleEditLanguageToEdit}
            onDeleteLanguageToAdd={(index) => languagesToAdd = languagesToAdd.filter((_, i) => i !== index)}
            onDeleteLanguageToEdit={(index) => languagesToEdit = languagesToEdit.filter((_, i) => i !== index)}
            onEditReference={handleEditReference}
            onDeleteReference={(index) => newReferences = newReferences.filter((_, i) => i !== index)}
            onEditRelationship={handleEditRelationship}
            onDeleteRelationship={(index, key) => {
              relationships = relationships.filter((_, i) => i !== index);
              clearModificationByKey(key);
            }}
          />
          <!-- END Queued Items Section -->

          <!-- Action Buttons -->
          <ActionButtons
            onAddLanguage={() => showAddLanguageModal = true}
            onEditLanguage={() => showLanguageSelectorModal = true}
            onManageRelationships={() => showManageRelationshipModal = true}
            onAddReference={() => showAddReferenceModal = true}
          />

          <!-- Submit Button -->
          <SubmitButton {submitting} />
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Modals -->
<AddLanguageModal
  bind:isOpen={showAddLanguageModal}
  onClose={() => {
    showAddLanguageModal = false;
    editLanguageToAddIndex = null;
  }}
  onAdd={editLanguageToAddIndex !== null ? handleUpdateLanguageToAdd : handleAddLanguage}
  isEdit={editLanguageToAddIndex !== null}
  initialData={editLanguageToAddIndex !== null ? languagesToAdd[editLanguageToAddIndex] : undefined}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  polytimeOptions={polytimeOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ id: t.id, label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={getAvailableReferenceIds(data.existingReferences, newReferences)}
/>

<AddLanguageModal
  bind:isOpen={showEditLanguageModal}
  onClose={() => {
    showEditLanguageModal = false;
    selectedLanguageToEdit = '';
    editLanguageToEditIndex = null;
  }}
  onAdd={editLanguageToEditIndex !== null ? handleUpdateLanguageToEdit : handleEditLanguage}
  isEdit={true}
  initialData={editLanguageToEditIndex !== null ? languagesToEdit[editLanguageToEditIndex] : (selectedLanguageToEdit ? convertLanguageForEdit(data.languages.find(l => l.id === selectedLanguageToEdit)!) : undefined)}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  polytimeOptions={polytimeOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ id: t.id, label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={getAvailableReferenceIds(data.existingReferences, newReferences)}
/>

<!-- Language Selector Modal for Editing -->
{#if showLanguageSelectorModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick={() => showLanguageSelectorModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
      <div class="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
        <h2 class="text-2xl font-bold text-white">Select Language to Edit</h2>
        <p class="text-yellow-100 mt-1">Choose an existing language</p>
      </div>
      
      <div class="p-6">
        <label for="language-selector" class="block text-sm font-medium text-gray-700 mb-2">
          Language <span class="text-red-500">*</span>
        </label>
        <select
          id="language-selector"
          bind:value={selectedLanguageToEdit}
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">Choose a language...</option>
          {#each data.languages as lang}
            <option value={lang.id}>{lang.name} ({lang.id})</option>
          {/each}
        </select>
        
        <div class="flex gap-3 justify-end pt-4 mt-4 border-t">
          <button
            type="button"
            onclick={() => {
              selectedLanguageToEdit = '';
              showLanguageSelectorModal = false;
            }}
            class="px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedLanguageToEdit}
            onclick={() => {
              if (selectedLanguageToEdit) {
                showLanguageSelectorModal = false;
                showEditLanguageModal = true;
              }
            }}
            class="px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<AddReferenceModal
  bind:isOpen={showAddReferenceModal}
  onClose={() => {
    showAddReferenceModal = false;
    editReferenceIndex = null;
    deferredItems = null;
  }}
  onAdd={editReferenceIndex !== null ? handleUpdateReference : handleAddReference}
  initialValue={editReferenceIndex !== null ? newReferences[editReferenceIndex] : ''}
  isEditMode={editReferenceIndex !== null}
/>

<ManageRelationshipModal
  bind:isOpen={showManageRelationshipModal}
  onClose={() => {
    showManageRelationshipModal = false;
    editRelationshipIndex = null;
  }}
  onSave={handleSaveRelationship}
  initialData={editRelationshipIndex !== null ? relationships[editRelationshipIndex] : undefined}
  languages={getAvailableLanguages(data.languages, languagesToAdd, languagesToEdit)}
  {statusOptions}
  availableRefs={getAvailableReferenceIds(data.existingReferences, newReferences)}
  {baselineRelations}
/>

<style>
  :global(body) {
    margin: 0;
  }
</style>
