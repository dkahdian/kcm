<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';
  import ContributorInfo from '$lib/components/contribute/ContributorInfo.svelte';
  import LanguageChip from '$lib/components/contribute/LanguageChip.svelte';
  import ReferenceChip from '$lib/components/contribute/ReferenceChip.svelte';
  import RelationshipChip from '$lib/components/contribute/RelationshipChip.svelte';
  import AddItemButtons from '$lib/components/contribute/AddItemButtons.svelte';
  import AddLanguageModal from '$lib/components/contribute/AddLanguageModal.svelte';
  import AddReferenceModal from '$lib/components/contribute/AddReferenceModal.svelte';
  import ManageRelationshipModal from '$lib/components/contribute/ManageRelationshipModal.svelte';

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

  const languageLookup = new Map(data.languages.map((lang) => [lang.id, lang]));

  type SeparatingFunctionEntry = {
    shortName: string;
    name: string;
    description: string;
    refs: string[];
  };

  type RelationshipEntry = {
    sourceId: string;
    targetId: string;
    status: TransformationStatus;
    refs: string[];
    separatingFunctions?: SeparatingFunctionEntry[];
  };

  function relationKey(sourceId: string, targetId: string): string {
    return `${sourceId}->${targetId}`;
  }

  // Build baseline relations from adjacency matrix
  const baselineRelations = new Map<string, { status: TransformationStatus; refs: string[]; separatingFunctions: SeparatingFunctionEntry[] }>();

  const { languageIds, matrix } = data.adjacencyMatrix;
  for (let i = 0; i < languageIds.length; i++) {
    for (let j = 0; j < languageIds.length; j++) {
      const relation = matrix[i][j];
      if (relation) {
        const sourceId = languageIds[i];
        const targetId = languageIds[j];
        baselineRelations.set(relationKey(sourceId, targetId), {
          status: relation.status,
          refs: relation.refs ? [...relation.refs] : [],
          separatingFunctions: relation.separatingFunctions ? relation.separatingFunctions.map(fn => ({
            shortName: fn.shortName,
            name: fn.name,
            description: fn.description,
            refs: [...fn.refs]
          })) : []
        });
      }
    }
  }
  
  const bibtexPlaceholder = `@article{Darwiche_2002,
  title={A Knowledge Compilation Map},
  author={Darwiche, Adnan and Marquis, Pierre},
  journal={Journal of AI Research},
  year={2002}
}`;

  // Contributor information
  let contributorEmail = $state('');
  let contributorGithub = $state('');

  // NEW: Bulk operations support
  // Languages to add (array of new languages)
  type LanguageToAdd = {
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

  let languagesToAdd = $state<LanguageToAdd[]>([]);
  let languagesToEdit = $state<LanguageToAdd[]>([]);

  // Relationships (always visible, works with existing + new languages)
  let relationships = $state<RelationshipEntry[]>([]);

  // Track expanded state for chip UI
  let expandedLanguageToAddIndex = $state<number | null>(null);
  let expandedLanguageToEditIndex = $state<number | null>(null);
  let expandedRelationshipIndex = $state<number | null>(null);
  let expandedReferenceIndex = $state<number | null>(null);
  let expandedTagIndex = $state<number | null>(null);

  // Modal visibility state
  let showAddLanguageModal = $state(false);
  let showEditLanguageModal = $state(false);
  let showLanguageSelectorModal = $state(false);
  let selectedLanguageToEdit = $state<string>('');
  let showAddReferenceModal = $state(false);
  let showManageRelationshipModal = $state(false);

  // Track which relationships have been modified from baseline
  const modifiedRelations = new Set<string>();

  function recordModification(rel: RelationshipEntry) {
    modifiedRelations.add(relationKey(rel.sourceId, rel.targetId));
  }

  function clearModificationByKey(key: string) {
    modifiedRelations.delete(key);
  }

  let newReferences = $state<string[]>([]);
  let customTags = $state<Array<{ id: string; label: string; color: string; description?: string; refs: string[] }>>([]);

  let submitting = $state(false);
  let submitError = $state('');

  function availableReferenceIds() {
    const existing = data.existingReferences.map((r: { id: string; title: string }) => r.id);
    const newRefs = newReferences.map((_, index) => `new-${index}`);
    return [...existing, ...newRefs];
  }

  // Combined language list (existing + new from this submission)
  function availableLanguages() {
    const existing = data.languages.map(l => ({ id: l.id, name: l.name }));
    const newLangs = languagesToAdd.map(l => ({ id: l.id, name: l.name }));
    const editedLangs = languagesToEdit.map(l => ({ id: l.id, name: l.name }));
    return [...existing, ...newLangs, ...editedLangs];
  }

  // Convert KCLanguage to the format expected by AddLanguageModal
  function convertLanguageForEdit(lang: typeof data.languages[0]) {
    return {
      id: lang.id,
      name: lang.name,
      fullName: lang.fullName || '',
      description: lang.description || '',
      descriptionRefs: lang.descriptionRefs || [],
      queries: lang.properties?.queries || {},
      transformations: lang.properties?.transformations || {},
      tags: (lang.tags || []).map(t => ({ ...t, color: t.color || '#6366f1' })),
      existingReferences: lang.references?.map(r => r.id) || []
    };
  }

  // Modal handlers
  function handleAddLanguage(language: LanguageToAdd) {
    languagesToAdd = [...languagesToAdd, language];
  }

  function handleEditLanguage(language: LanguageToAdd) {
    const index = languagesToEdit.findIndex(l => l.id === language.id);
    if (index >= 0) {
      languagesToEdit[index] = language;
      languagesToEdit = [...languagesToEdit];
    } else {
      languagesToEdit = [...languagesToEdit, language];
    }
  }

  function handleAddReference(bibtex: string) {
    newReferences = [...newReferences, bibtex];
  }

  function handleSaveRelationship(relationship: RelationshipEntry) {
    // Check if this relationship already exists (editing)
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
      const changedRelationships = relationships.filter((rel) =>
        modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))
      );

      // Validate we have something to submit
      if (languagesToAdd.length === 0 && languagesToEdit.length === 0 && changedRelationships.length === 0) {
        submitError = 'Please add a language, edit a language, or update at least one relationship before submitting.';
        submitting = false;
        return;
      }

      const formattedRelationships = changedRelationships.map((rel) => ({
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        status: rel.status,
        refs: rel.refs,
        separatingFunctions: rel.separatingFunctions || []
      }));

      // Transform languages to match backend expected format
      const formattedLanguagesToAdd = languagesToAdd.map(lang => ({
        id: lang.id,
        name: lang.name,
        fullName: lang.fullName,
        description: lang.description,
        descriptionRefs: lang.descriptionRefs,
        properties: {
          queries: lang.queries,
          transformations: lang.transformations
        },
        tags: lang.tags,
        existingReferences: lang.existingReferences
      }));

      const formattedLanguagesToEdit = languagesToEdit.map(lang => ({
        id: lang.id,
        name: lang.name,
        fullName: lang.fullName,
        description: lang.description,
        descriptionRefs: lang.descriptionRefs,
        properties: {
          queries: lang.queries,
          transformations: lang.transformations
        },
        tags: lang.tags,
        existingReferences: lang.existingReferences
      }));

      const submission = {
        contributorEmail,
        contributorGithub: contributorGithub || undefined,
        languagesToAdd: formattedLanguagesToAdd,
        languagesToEdit: formattedLanguagesToEdit,
        relationships: formattedRelationships,
        newReferences,
        existingLanguageIds: data.existingLanguageIds
      };

      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });

      const result = await response.json();

      if (!response.ok) {
        submitError = result.error || 'Submission failed';
        submitting = false;
        return;
      }

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
        Contribute to the KC Map
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
          </div>

          <!-- Queued Items Section -->
          <div class="space-y-3">
            <h2 class="text-lg font-bold text-gray-900">Queued Changes</h2>
            <p class="text-sm text-gray-600">Items you've added will appear here.</p>
            
            <div class="space-y-2">
              <!-- Languages to Add -->
              {#each languagesToAdd as lang, index}
                <div class="border-2 border-green-300 bg-green-50 rounded-lg p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-green-800">NEW LANG:</span>
                      <span class="text-sm text-gray-900">{lang.name} ({lang.id})</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onclick={() => expandedLanguageToAddIndex = expandedLanguageToAddIndex === index ? null : index}
                        class="text-green-700 hover:text-green-900 font-bold text-lg"
                        aria-label={expandedLanguageToAddIndex === index ? "Collapse" : "Expand"}
                      >
                        {expandedLanguageToAddIndex === index ? '∨' : '^'}
                      </button>
                      <button
                        type="button"
                        onclick={() => languagesToAdd = languagesToAdd.filter((_, i) => i !== index)}
                        class="text-red-600 hover:text-red-800 font-bold"
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {#if expandedLanguageToAddIndex === index}
                    <div class="mt-4 pt-4 border-t border-green-200 space-y-4">
                      <p class="text-xs text-gray-600 italic">Full language form would go here (all queries, transformations, tags, etc.)</p>
                      <!-- TODO: Full language form -->
                    </div>
                  {/if}
                </div>
              {/each}

              <!-- Languages to Edit -->
              {#each languagesToEdit as lang, index}
                <div class="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-yellow-800">EDIT LANG:</span>
                      <span class="text-sm text-gray-900">{lang.name} ({lang.id})</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onclick={() => expandedLanguageToEditIndex = expandedLanguageToEditIndex === index ? null : index}
                        class="text-yellow-700 hover:text-yellow-900 font-bold text-lg"
                        aria-label={expandedLanguageToEditIndex === index ? "Collapse" : "Expand"}
                      >
                        {expandedLanguageToEditIndex === index ? '∨' : '^'}
                      </button>
                      <button
                        type="button"
                        onclick={() => languagesToEdit = languagesToEdit.filter((_, i) => i !== index)}
                        class="text-red-600 hover:text-red-800 font-bold"
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {#if expandedLanguageToEditIndex === index}
                    <div class="mt-4 pt-4 border-t border-yellow-200 space-y-4">
                      <p class="text-xs text-gray-600 italic">Full language form would go here</p>
                      <!-- TODO: Full language form -->
                    </div>
                  {/if}
                </div>
              {/each}

              <!-- References -->
              {#each newReferences as ref, index}
                <div class="border-2 border-purple-300 bg-purple-50 rounded-lg p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-purple-800">REF:</span>
                      <span class="text-sm text-gray-900">new-{index}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onclick={() => expandedReferenceIndex = expandedReferenceIndex === index ? null : index}
                        class="text-purple-700 hover:text-purple-900 font-bold text-lg"
                        aria-label={expandedReferenceIndex === index ? "Collapse" : "Expand"}
                      >
                        {expandedReferenceIndex === index ? '∨' : '^'}
                      </button>
                      <button
                        type="button"
                        onclick={() => newReferences = newReferences.filter((_, i) => i !== index)}
                        class="text-red-600 hover:text-red-800 font-bold"
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {#if expandedReferenceIndex === index}
                    <div class="mt-4 pt-4 border-t border-purple-200">
                      <pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto">{ref}</pre>
                    </div>
                  {/if}
                </div>
              {/each}

              <!-- Relationships -->
              {#each relationships as rel, index}
                {@const key = relationKey(rel.sourceId, rel.targetId)}
                {@const isModified = modifiedRelations.has(key)}
                {#if isModified}
                  <div class="border-2 border-blue-300 bg-blue-50 rounded-lg p-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-blue-800">REL:</span>
                        <span class="text-sm text-gray-900">{rel.sourceId} → {rel.targetId}</span>
                        <span class="text-xs text-gray-600">({rel.status})</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          onclick={() => expandedRelationshipIndex = expandedRelationshipIndex === index ? null : index}
                          class="text-blue-700 hover:text-blue-900 font-bold text-lg"
                          aria-label={expandedRelationshipIndex === index ? "Collapse" : "Expand"}
                        >
                          {expandedRelationshipIndex === index ? '∨' : '^'}
                        </button>
                        <button
                          type="button"
                          onclick={() => {
                            relationships = relationships.filter((_, i) => i !== index);
                            clearModificationByKey(key);
                          }}
                          class="text-red-600 hover:text-red-800 font-bold"
                          aria-label="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    {#if expandedRelationshipIndex === index}
                      <div class="mt-4 pt-4 border-t border-blue-200 space-y-4">
                        <p class="text-xs text-gray-600 italic">Relationship editing form would go here (status, refs, separating functions)</p>
                        <!-- TODO: Full relationship form -->
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}

              {#if languagesToAdd.length === 0 && languagesToEdit.length === 0 && newReferences.length === 0 && relationships.filter((rel) => modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))).length === 0}
                <div class="text-center py-8 text-gray-500 italic">
                  No changes queued yet. Use the buttons below to add items.
                </div>
              {/if}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onclick={() => showAddLanguageModal = true}
              class="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              + New Language
            </button>
            
            <button
              type="button"
              onclick={() => showLanguageSelectorModal = true}
              class="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
            >
              ✎ Edit Language
            </button>
            
            <button
              type="button"
              onclick={() => showManageRelationshipModal = true}
              class="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              🔗 Manage Relationships
            </button>
            
            <button
              type="button"
              onclick={() => showAddReferenceModal = true}
              class="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              + New Reference
            </button>
          </div>

          <!-- Submit Button -->
          <div class="pt-6">
            <button
              type="submit"
              disabled={submitting}
              class="group relative w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span class="flex items-center justify-center">
                {#if submitting}
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Submission...
                {:else}
                  <svg class="w-5 h-5 mr-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Contribution
                {/if}
              </span>
            </button>
            <p class="text-center text-sm text-gray-500 mt-4">
              Your submission will be reviewed and processed automatically
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Modals -->
<AddLanguageModal
  bind:isOpen={showAddLanguageModal}
  onClose={() => showAddLanguageModal = false}
  onAdd={handleAddLanguage}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  polytimeOptions={polytimeOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ id: t.id, label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={availableReferenceIds()}
/>

<AddLanguageModal
  bind:isOpen={showEditLanguageModal}
  onClose={() => {
    showEditLanguageModal = false;
    selectedLanguageToEdit = '';
  }}
  onAdd={handleEditLanguage}
  isEdit={true}
  initialData={selectedLanguageToEdit ? convertLanguageForEdit(data.languages.find(l => l.id === selectedLanguageToEdit)!) : undefined}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  polytimeOptions={polytimeOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ id: t.id, label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={availableReferenceIds()}
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
  onClose={() => showAddReferenceModal = false}
  onAdd={handleAddReference}
/>

<ManageRelationshipModal
  bind:isOpen={showManageRelationshipModal}
  onClose={() => showManageRelationshipModal = false}
  onSave={handleSaveRelationship}
  languages={availableLanguages()}
  {statusOptions}
  availableRefs={availableReferenceIds()}
  {baselineRelations}
/>

<style>
  :global(body) {
    margin: 0;
  }
</style>
