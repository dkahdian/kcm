<script lang="ts">

  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';
  import AddLanguageModal from '$lib/components/contribute/AddLanguageModal.svelte';
  import AddReferenceModal from '$lib/components/contribute/AddReferenceModal.svelte';
  import ManageRelationshipModal from '$lib/components/contribute/ManageRelationshipModal.svelte';
  import ContributionQueue from './components/ContributionQueue.svelte';
  import ActionButtons from './components/ActionButtons.svelte';
  import PreviewButton from './components/PreviewButton.svelte';
  import ContributionHistorySidebar from '$lib/components/contribute/ContributionHistorySidebar.svelte';
  import { 
    relationKey, 
    buildBaselineRelations,
    getAvailableReferenceIds,
    getAvailableLanguages,
    convertLanguageForEdit,
    generateReferenceId
  } from './logic.js';
  import type { LanguageToAdd, RelationshipEntry, CustomTag, DeferredItems, SeparatingFunctionEntry } from './types.js';
  import { 
    loadHistory, 
    addHistoryEntry, 
    updateHistoryEntry, 
    deleteHistoryEntry,
    getPreviewUrl,
    type ContributionHistoryEntry,
    type PersistedQueueState as HistoryPersistedQueueState
  } from '$lib/utils/history.js';
  import { generateSubmissionId } from '$lib/utils/submission-id.js';
  import { onMount } from 'svelte';

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
  }

  interface ContributorInfo {
    email: string;
    github: string;
    note: string;
  }

  const isString = (value: unknown): value is string => typeof value === 'string';

  const sanitizeStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter(isString) : [];

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

  // History management
  let contributionHistory = $state<ContributionHistoryEntry[]>([]);
  let currentSubmissionId = $state<string | null>(null);
  let isUpdatingExisting = $state(false);

  // Derived state: check if queue has any items
  const hasQueuedItems = $derived(
    languagesToAdd.length > 0 ||
    languagesToEdit.length > 0 ||
    relationships.filter(rel => modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))).length > 0 ||
    newReferences.length > 0 ||
    customTags.length > 0
  );

  onMount(() => {
    if (!browser) {
      queuePersistenceReady = true;
      return;
    }

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
      }

      // Restore contributor info
      const contributorStored = localStorage.getItem(CONTRIBUTOR_STORAGE_KEY);
      if (contributorStored) {
        const contributorParsed = JSON.parse(contributorStored) as Partial<ContributorInfo>;
        if (isString(contributorParsed?.email)) contributorEmail = contributorParsed.email;
        if (isString(contributorParsed?.github)) contributorGithub = contributorParsed.github;
        if (isString(contributorParsed?.note)) contributorNote = contributorParsed.note;
      }

      // Load contribution history
      contributionHistory = loadHistory();
    } catch (error) {
      console.warn('Failed to restore queued changes from storage', error);
    } finally {
      queuePersistenceReady = true;
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
      return;
    }

    const snapshot: PersistedQueueState = {
      languagesToAdd,
      languagesToEdit,
      relationships,
      newReferences,
      customTags,
      modifiedRelations: Array.from(modifiedRelations)
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

  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!browser || isSubmitting) return;

    // Validate required fields
    if (!contributorEmail) {
      submitError = 'Email address is required';
      return;
    }

    if (!hasQueuedItems) {
      submitError = 'Please add at least one change before submitting';
      return;
    }

    isSubmitting = true;
    submitError = null;

    try {
      // Generate or reuse submission ID
      if (!currentSubmissionId) {
        currentSubmissionId = generateSubmissionId();
      }

      // Create queue snapshot
      const queueSnapshot: PersistedQueueState = {
        languagesToAdd,
        languagesToEdit,
        relationships,
        newReferences,
        customTags,
        modifiedRelations: Array.from(modifiedRelations)
      };

      // Create history entry (optimistic)
      const historyEntry: ContributionHistoryEntry = {
        submissionId: currentSubmissionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        contributor: {
          email: contributorEmail,
          github: contributorGithub || undefined
        },
        status: 'pending',
        queueSnapshot
      };

      addHistoryEntry(historyEntry);
      contributionHistory = loadHistory();

      // Build API payload
      const payload = {
        submissionId: currentSubmissionId,
        contributorEmail,
        contributorGithub: contributorGithub || undefined,
        contributorNote: contributorNote || undefined,
        languagesToAdd,
        languagesToEdit,
        relationships: relationships.filter(rel => 
          modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))
        ),
        newReferences,
        customTags
      };

      // For update, add branch name
      if (isUpdatingExisting && historyEntry.branchName) {
        (payload as any).branchName = historyEntry.branchName;
      }

      // Call GitHub API directly (token split for basic obfuscation)
      const t1 = 'github_pat_11BODXYDQ0Fw5d4huTq6Ff_0w6DLns2rxcWbDjrX4oQz';
      const t2 = 'uYuSB5EGMOq31ueJ64VNZjTICPO27KQESFcK7l';
      const token = t1 + t2;

      const eventType = isUpdatingExisting ? 'update-data-contribution' : 'data-contribution';

      const response = await fetch('https://api.github.com/repos/dkahdian/kcm/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: eventType,
          client_payload: payload
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit contribution: ${response.statusText}`);
      }

      // Update history entry with optimistic data
      // repository_dispatch returns 204 No Content, so we estimate the values
      updateHistoryEntry(currentSubmissionId, {
        status: 'pending', // Will be updated to 'open' once PR is created
        branchName: `contribution/${currentSubmissionId}`
        // prNumber and previewUrl will be updated by workflow
      });

      // Clear queue state
      languagesToAdd = [];
      languagesToEdit = [];
      relationships = [];
      newReferences = [];
      customTags = [];
      modifiedRelations = new Set();
      currentSubmissionId = null;
      isUpdatingExisting = false;

      // Redirect to success page
      window.location.href = '/contribute/success';

    } catch (error) {
      console.error('Submission error:', error);
      
      submitError = error instanceof Error ? error.message : 'Failed to submit contribution. Please try again.';
      
      // Update history with error
      if (currentSubmissionId) {
        updateHistoryEntry(currentSubmissionId, {
          status: 'error',
          errorMessage: submitError
        });
        contributionHistory = loadHistory();
      }
      
      isSubmitting = false;
    }
  }

  // History sidebar handlers
  function handleLoadFromHistory(entry: ContributionHistoryEntry) {
    const hasUnsaved = hasQueuedItems;
    
    if (hasUnsaved) {
      const confirmed = confirm('You have unsaved changes. Loading this contribution will discard them. Continue?');
      if (!confirmed) return;
    }

    // Load queue state from history
    const snapshot = entry.queueSnapshot;
    languagesToAdd = sanitizeLanguages(snapshot.languagesToAdd);
    languagesToEdit = sanitizeLanguages(snapshot.languagesToEdit);
    relationships = sanitizeRelationships(snapshot.relationships);
    newReferences = sanitizeStringArray(snapshot.newReferences);
    customTags = sanitizeTags(snapshot.customTags);
    modifiedRelations = new Set(sanitizeStringArray(snapshot.modifiedRelations));

    // Load contributor info
    contributorEmail = entry.contributor.email;
    contributorGithub = entry.contributor.github || '';

    // Set current submission ID for updating
    currentSubmissionId = entry.submissionId;
    isUpdatingExisting = entry.status === 'open' || entry.status === 'error';
  }

  function handleUpdateFromHistory(entry: ContributionHistoryEntry) {
    // Load the entry first
    handleLoadFromHistory(entry);
    
    // Mark as updating
    isUpdatingExisting = true;
  }

  function handleDeleteFromHistory(submissionId: string) {
    deleteHistoryEntry(submissionId);
    contributionHistory = loadHistory();
  }

  async function handleRefreshStatus(submissionId: string) {
    const entry = contributionHistory.find(e => e.submissionId === submissionId);
    if (!entry || !entry.prNumber) return;

    try {
      const response = await fetch(`https://api.github.com/repos/dkahdian/kcm/pulls/${entry.prNumber}`);
      if (response.ok) {
        const pr = await response.json();
        const status = pr.merged ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';
        
        updateHistoryEntry(submissionId, { status });
        contributionHistory = loadHistory();
      }
    } catch (error) {
      console.error('Failed to refresh PR status:', error);
    }
  }
</script>

<svelte:head>
  <title>Contribute - Knowledge Compilation Map</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
        Contribute to the KC Map
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Help improve the Knowledge Compilation Map by adding new languages or updating existing ones.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- History Sidebar -->
      <div class="lg:col-span-1 order-2 lg:order-1">
        <ContributionHistorySidebar
          entries={contributionHistory}
          onLoad={handleLoadFromHistory}
          onUpdate={handleUpdateFromHistory}
          onDelete={handleDeleteFromHistory}
          onRefreshStatus={handleRefreshStatus}
        />
      </div>

      <!-- Main Form -->
      <div class="lg:col-span-2 order-1 lg:order-2">

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

          <!-- Submit Button -->
          <PreviewButton disabled={!hasQueuedItems} isSubmitting={isSubmitting} error={submitError} />
        </form>
      </div>
    </div>
      </div>
      <!-- End Main Form -->
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
