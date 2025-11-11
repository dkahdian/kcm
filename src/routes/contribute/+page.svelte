<script lang="ts">

  import { browser } from '$app/environment';
  import { v4 as uuidv4 } from 'uuid';
  import type { PageData } from './$types';
  import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';
  import AddLanguageModal from '$lib/components/contribute/AddLanguageModal.svelte';
  import AddReferenceModal from '$lib/components/contribute/AddReferenceModal.svelte';
  import ManageRelationshipModal from '$lib/components/contribute/ManageRelationshipModal.svelte';
  import ContributionQueue from './components/ContributionQueue.svelte';
  import ActionButtons from './components/ActionButtons.svelte';
  import PreviewButton from './components/PreviewButton.svelte';
  import { 
    relationKey, 
    buildBaselineRelations,
    getAvailableReferenceIds,
    getAvailableLanguages,
    convertLanguageForEdit
  } from './logic.js';
  import { generateReferenceId } from '$lib/utils/reference-id.js';
  import type {
    LanguageToAdd,
    RelationshipEntry,
    CustomTag,
    DeferredItems,
    SeparatingFunctionEntry,
    SubmissionHistoryEntry,
    ContributorInfo
  } from './types.js';
  import { onMount } from 'svelte';
  import { loadSubmissionHistory } from '$lib/utils/submission-history.js';

  type OperationResult = { success: boolean; error?: string };

  const QUEUE_STORAGE_KEY = 'kcm_contribute_queue_v1';
  const CONTRIBUTOR_STORAGE_KEY = 'kcm_contributor_info_v1';

  interface PersistedQueueState {
    languagesToAdd: LanguageToAdd[];
    languagesToEdit: LanguageToAdd[];
    relationships: RelationshipEntry[];
    newReferences: string[];
    customTags: CustomTag[];
    modifiedRelations: string[];
    submissionId?: string;
    supersedesSubmissionId?: string | null;
  }

  const isString = (value: unknown): value is string => typeof value === 'string';

  const sanitizeStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter(isString) : [];

  const createSubmissionId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return uuidv4();
  };

  const sanitizeSubmissionId = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value : null;

  function sanitizeOperationSupportRecord(
    value: unknown
  ): Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }> {
    if (!value || typeof value !== 'object') return {};
    const result: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }> = {};
    for (const [key, raw] of Object.entries(value as Record<string, any>)) {
      if (!raw || typeof raw !== 'object') continue;
      const polytime = isString(raw.polytime) ? (raw.polytime as PolytimeFlagCode) : 'unknown';
      const note = isString(raw.note) ? raw.note : undefined;
      const refs = sanitizeStringArray(raw.refs);
      const entry: { polytime: PolytimeFlagCode; note?: string; refs: string[] } = {
        polytime,
        refs
      };
      if (note) entry.note = note;
      result[key] = entry;
    }
    return result;
  }

  function sanitizeTags(value: unknown): CustomTag[] {
    if (!Array.isArray(value)) return [];
    const results: CustomTag[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const raw = item as Record<string, any>;
      if (!isString(raw.id) || !isString(raw.label)) continue;
      results.push({
        id: raw.id,
        label: raw.label,
        color: isString(raw.color) ? raw.color : '#6366f1',
        description: isString(raw.description) ? raw.description : undefined,
        refs: sanitizeStringArray(raw.refs)
      });
    }
    return results;
  }

  function sanitizeLanguages(value: unknown): LanguageToAdd[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const raw = entry as Record<string, any>;
        if (!isString(raw.id) || !isString(raw.name) || !isString(raw.fullName) || !isString(raw.description)) {
          return null;
        }
        return {
          id: raw.id,
          name: raw.name,
          fullName: raw.fullName,
          description: raw.description,
          descriptionRefs: sanitizeStringArray(raw.descriptionRefs),
          queries: sanitizeOperationSupportRecord(raw.queries),
          transformations: sanitizeOperationSupportRecord(raw.transformations),
          tags: sanitizeTags(raw.tags),
          existingReferences: sanitizeStringArray(raw.existingReferences)
        } satisfies LanguageToAdd;
      })
      .filter((item): item is LanguageToAdd => item !== null);
  }

  function sanitizeSeparatingFunctions(value: unknown): SeparatingFunctionEntry[] {
    if (!Array.isArray(value)) return [];
    const results: SeparatingFunctionEntry[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const raw = entry as Record<string, any>;
      if (!isString(raw.shortName) || !isString(raw.name) || !isString(raw.description)) continue;
      results.push({
        shortName: raw.shortName,
        name: raw.name,
        description: raw.description,
        refs: sanitizeStringArray(raw.refs)
      });
    }
    return results;
  }

  function sanitizeRelationships(value: unknown): RelationshipEntry[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const raw = entry as Record<string, any>;
        if (!isString(raw.sourceId) || !isString(raw.targetId) || !isString(raw.status)) return null;
        const separatingFunctions = sanitizeSeparatingFunctions(raw.separatingFunctions);
        const relationship: RelationshipEntry = {
          sourceId: raw.sourceId,
          targetId: raw.targetId,
          status: raw.status as TransformationStatus,
          refs: sanitizeStringArray(raw.refs)
        };
        if (separatingFunctions.length > 0) {
          relationship.separatingFunctions = separatingFunctions;
        }
        return relationship;
      })
      .filter((item): item is RelationshipEntry => item !== null);
  }

  const cloneLanguageEntry = (language: LanguageToAdd): LanguageToAdd => ({
    ...language,
    descriptionRefs: [...language.descriptionRefs],
    queries: Object.fromEntries(
      Object.entries(language.queries).map(([code, support]) => [code, { ...support, refs: [...support.refs] }])
    ),
    transformations: Object.fromEntries(
      Object.entries(language.transformations).map(([code, support]) => [code, { ...support, refs: [...support.refs] }])
    ),
    tags: language.tags.map((tag) => ({ ...tag, refs: [...tag.refs] })),
    existingReferences: [...language.existingReferences]
  });

  const cloneRelationshipEntry = (relationship: RelationshipEntry): RelationshipEntry => ({
    ...relationship,
    refs: [...relationship.refs],
    separatingFunctions: relationship.separatingFunctions
      ? relationship.separatingFunctions.map((fn) => ({ ...fn, refs: [...fn.refs] }))
      : undefined
  });

  const cloneCustomTag = (tag: CustomTag): CustomTag => ({ ...tag, refs: [...tag.refs] });

  const formatHistoryTimestamp = (iso: string): string => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const formatHistorySummary = (entry: SubmissionHistoryEntry): string => {
    const segments: string[] = [];
    if (entry.summary.languagesToAdd) {
      segments.push(`${entry.summary.languagesToAdd} new ${entry.summary.languagesToAdd === 1 ? 'language' : 'languages'}`);
    }
    if (entry.summary.languagesToEdit) {
      segments.push(`${entry.summary.languagesToEdit} edit${entry.summary.languagesToEdit === 1 ? '' : 's'}`);
    }
    if (entry.summary.relationships) {
      segments.push(`${entry.summary.relationships} relation${entry.summary.relationships === 1 ? '' : 's'}`);
    }
    if (entry.summary.newReferences) {
      segments.push(`${entry.summary.newReferences} reference${entry.summary.newReferences === 1 ? '' : 's'}`);
    }

    return segments.length > 0 ? segments.join(' · ') : 'No changes';
  };

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
  let modifiedRelations = $state(new Set<string>());
  let queuePersistenceReady = $state(false);

  // Additional state (declared before hasQueuedItems to avoid TDZ errors)
  let newReferences = $state<string[]>([]);
  let customTags = $state<CustomTag[]>([]);

  // Submission metadata & history
  let activeSubmissionId = $state('');
  let supersedesSubmissionId = $state<string | null>(null);
  let submissionHistory = $state<SubmissionHistoryEntry[]>([]);
  let isHistoryOpen = $state(false);

  // Derived state: check if queue has any items
  const hasQueuedItems = $derived(
    languagesToAdd.length > 0 ||
    languagesToEdit.length > 0 ||
    relationships.filter(rel => modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))).length > 0 ||
    newReferences.length > 0 ||
    customTags.length > 0
  );

  let previousHasQueuedItems = false;

  $effect(() => {
    if (!browser) return;

    const currentlyQueued = hasQueuedItems;

    if (currentlyQueued && !previousHasQueuedItems && !activeSubmissionId) {
      activeSubmissionId = createSubmissionId();
    }

    if (!currentlyQueued && previousHasQueuedItems) {
      activeSubmissionId = createSubmissionId();
      supersedesSubmissionId = null;
    }

    previousHasQueuedItems = currentlyQueued;
  });

  onMount(() => {
    if (!browser) {
      queuePersistenceReady = true;
      return;
    }

    submissionHistory = loadSubmissionHistory();

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PersistedQueueState>;
        languagesToAdd = sanitizeLanguages(parsed?.languagesToAdd);
        languagesToEdit = sanitizeLanguages(parsed?.languagesToEdit);
        relationships = sanitizeRelationships(parsed?.relationships);
        newReferences = sanitizeStringArray(parsed?.newReferences);
        customTags = sanitizeTags(parsed?.customTags);
        modifiedRelations = new Set(sanitizeStringArray(parsed?.modifiedRelations));
        activeSubmissionId = sanitizeSubmissionId(parsed?.submissionId) ?? '';
        supersedesSubmissionId = sanitizeSubmissionId(parsed?.supersedesSubmissionId);
      }

      // Restore contributor info
      const contributorStored = localStorage.getItem(CONTRIBUTOR_STORAGE_KEY);
      if (contributorStored) {
        const contributorParsed = JSON.parse(contributorStored) as Partial<ContributorInfo>;
        if (isString(contributorParsed?.email)) contributorEmail = contributorParsed.email;
        if (isString(contributorParsed?.github)) contributorGithub = contributorParsed.github;
        if (isString(contributorParsed?.note)) contributorNote = contributorParsed.note;
      }
    } catch (error) {
      console.warn('Failed to restore queued changes from storage', error);
    } finally {
      queuePersistenceReady = true;
    }

    if (!activeSubmissionId) {
      activeSubmissionId = createSubmissionId();
    }
  });

  function updateModifiedRelations(updater: (current: Set<string>) => Set<string>) {
    const next = updater(modifiedRelations);
    modifiedRelations = new Set(next);
  }

  function recordModification(rel: RelationshipEntry) {
    const key = relationKey(rel.sourceId, rel.targetId);
    updateModifiedRelations((current) => {
      const updated = new Set(current);
      updated.add(key);
      return updated;
    });
  }

  function clearModificationByKey(key: string) {
    updateModifiedRelations((current) => {
      if (!current.has(key)) return current;
      const updated = new Set(current);
      updated.delete(key);
      return updated;
    });
  }

  $effect(() => {
    if (!queuePersistenceReady || !browser) return;

    if (!activeSubmissionId) {
      activeSubmissionId = createSubmissionId();
    }

    const isEmptyQueue =
      languagesToAdd.length === 0 &&
      languagesToEdit.length === 0 &&
      relationships.length === 0 &&
      newReferences.length === 0 &&
      customTags.length === 0 &&
      modifiedRelations.size === 0;

    if (isEmptyQueue) {
      try {
        localStorage.removeItem(QUEUE_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear queued changes from storage', error);
      }
      supersedesSubmissionId = null;
      return;
    }

    const snapshot: PersistedQueueState = {
      languagesToAdd,
      languagesToEdit,
      relationships,
      newReferences,
      customTags,
      modifiedRelations: Array.from(modifiedRelations),
      submissionId: activeSubmissionId,
      supersedesSubmissionId: supersedesSubmissionId ?? null
    };
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Failed to persist queued changes', error);
    }
  });

  // Persist contributor info separately
  $effect(() => {
    if (!queuePersistenceReady || !browser) return;
    
    const info: ContributorInfo = {
      email: contributorEmail,
      github: contributorGithub,
      note: contributorNote
    };
    
    try {
      localStorage.setItem(CONTRIBUTOR_STORAGE_KEY, JSON.stringify(info));
    } catch (error) {
      console.warn('Failed to persist contributor info', error);
    }
  });

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
    const remaining = relationships.filter(rel => 
      rel.sourceId !== langId && rel.targetId !== langId
    );
    relationships = remaining;

    updateModifiedRelations((current) => {
      if (current.size === 0) return current;
      const updated = new Set(current);
      for (const key of Array.from(updated)) {
        if (key.startsWith(`${langId}->`) || key.endsWith(`->${langId}`)) {
          updated.delete(key);
        }
      }
      return updated;
    });
  }

  // Cascade delete: when a reference is deleted, remove it from all dependencies
  function deleteReference(index: number) {
    // Compute the reference ID for the reference being deleted
    const existingIds = new Set(data.existingReferences.map(r => r.id));
    
    // Add IDs of all previous new references to maintain consistent ID generation
    for (let i = 0; i < index; i++) {
      const id = generateReferenceId(newReferences[i], existingIds);
      existingIds.add(id);
    }
    
    // Get the ID of the reference being deleted
    const refId = generateReferenceId(newReferences[index], existingIds);
    
    // Remove the reference from the array
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

    languagesToAdd = [...languagesToAdd];
    languagesToEdit = [...languagesToEdit];
    relationships = [...relationships];
    customTags = [...customTags];
  }

  function toggleHistoryPanel() {
    const nextOpen = !isHistoryOpen;
    isHistoryOpen = nextOpen;
    if (nextOpen) {
      submissionHistory = loadSubmissionHistory();
    }
  }

  function loadSubmissionFromHistory(entry: SubmissionHistoryEntry) {
    const payload = entry.payload;

    languagesToAdd = payload.languagesToAdd.map(cloneLanguageEntry);
    languagesToEdit = payload.languagesToEdit.map(cloneLanguageEntry);
    relationships = payload.relationships.map(cloneRelationshipEntry);
    newReferences = [...payload.newReferences];
    customTags = payload.customTags.map(cloneCustomTag);
    modifiedRelations = new Set(payload.modifiedRelations);

    contributorEmail = payload.contributor.email;
    contributorGithub = payload.contributor.github;
    contributorNote = payload.contributor.note;

    supersedesSubmissionId = payload.submissionId;
    activeSubmissionId = createSubmissionId();

    submissionHistory = loadSubmissionHistory();
    isHistoryOpen = false;

    // Reset transient UI state
    editReferenceIndex = null;
    deferredItems = null;
    editLanguageToAddIndex = null;
    editLanguageToEditIndex = null;
    editRelationshipIndex = null;
    expandedLanguageToAddIndex = null;
    expandedLanguageToEditIndex = null;
    expandedRelationshipIndex = null;
    expandedReferenceIndex = null;
  }

  function clearSupersedeLink() {
    supersedesSubmissionId = null;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    
    // Queue is already persisted via $effect, force full page reload to preview
    if (browser) {
      window.location.href = '/';
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

          <div class="flex justify-end">
            {#if supersedesSubmissionId}
              <div class="mr-auto mb-3 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm">
                <span class="font-medium">Editing prior submission</span>
                <button
                  type="button"
                  onclick={clearSupersedeLink}
                  class="rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                >
                  Stop
                </button>
              </div>
            {/if}
            <button
              type="button"
              onclick={toggleHistoryPanel}
              class="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-600"
            >
              <span aria-hidden="true">🗂️</span>
              Submission history
              <svg class={`h-3 w-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          {#if isHistoryOpen}
            <div class="mb-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-800">Previous submissions</h3>
                <button
                  type="button"
                  onclick={toggleHistoryPanel}
                  class="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200/70 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              {#if submissionHistory.length === 0}
                <p class="text-sm text-gray-500">No saved submissions yet. Submit once to keep a snapshot.</p>
              {:else}
                <ul class="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {#each submissionHistory as entry}
                    {@const summary = formatHistorySummary(entry)}
                    {@const timestamp = formatHistoryTimestamp(entry.createdAt)}
                    <li class="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <div class="flex items-start justify-between gap-3">
                        <div class="space-y-1">
                          <div class="text-sm font-medium text-gray-800">{timestamp}</div>
                          <div class="text-xs text-gray-600">{summary}</div>
                          {#if entry.supersededBySubmissionId}
                            <div class="text-xs font-medium text-amber-600">Superseded</div>
                          {:else if entry.payload.submissionId === supersedesSubmissionId}
                            <div class="text-xs font-medium text-emerald-600">Currently editing clone</div>
                          {/if}
                        </div>
                        <button
                          type="button"
                          onclick={() => loadSubmissionFromHistory(entry)}
                          class="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                        >
                          Load
                        </button>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}

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
            onDeleteReference={deleteReference}
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

          <!-- Preview Button -->
          <PreviewButton disabled={!hasQueuedItems} />
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
