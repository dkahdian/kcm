<script lang="ts">

  import { browser } from '$app/environment';
  import { v4 as uuidv4 } from 'uuid';
  import type { PageData } from './$types';
  import AddLanguageModal from '$lib/components/contribute/AddLanguageModal.svelte';
  import AddReferenceModal from '$lib/components/contribute/AddReferenceModal.svelte';
  import AddSeparatingFunctionModal from '$lib/components/contribute/AddSeparatingFunctionModal.svelte';
  import ManageRelationshipModal from '$lib/components/contribute/ManageRelationshipModal.svelte';
  import ContributionQueue from './components/ContributionQueue.svelte';
  import ActionButtons from './components/ActionButtons.svelte';
  import PreviewButton from './components/PreviewButton.svelte';
  import { 
    relationKey, 
    buildBaselineRelations,
    getAvailableReferenceIds,
    getAvailableLanguages,
    getAvailableSeparatingFunctions,
    convertLanguageForEdit
  } from './logic.js';
  import { generateReferenceId } from '$lib/utils/reference-id.js';
  import { generateLanguageId } from '$lib/utils/language-id.js';
  import type {
    LanguageToAdd,
    RelationshipEntry,
    CustomTag,
    SeparatingFunctionToAdd,
    SubmissionHistoryEntry,
    SubmissionHistoryPayload,
    ContributorInfo
  } from './types.js';
  import { onMount } from 'svelte';
  import { loadSubmissionHistory } from '$lib/utils/submission-history.js';

  type OperationResult = { success: boolean; error?: string };

  import { initialGraphData } from '$lib/data/index.js';
  import {
    applyContributionQueue,
    type ContributionQueueEntry,
    type ContributionQueueState
  } from '$lib/data/contribution-transforms.js';
  import {
    QUEUE_STORAGE_KEY,
    CONTRIBUTOR_STORAGE_KEY,
    savePreviewDataset,
    loadQueuedChanges
  } from '$lib/contribution-storage.js';

  type QueueLanguage = { queueEntryId: string; payload: LanguageToAdd };
  type QueueRelationship = { queueEntryId: string; payload: RelationshipEntry };
  type QueueSeparatingFunction = { queueEntryId: string; payload: SeparatingFunctionToAdd };
  type QueueReference = { queueEntryId: string; bibtex: string };

  type PersistedQueueState = ContributionQueueState;

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
  ): Record<string, { complexity: string; note?: string; refs: string[] }> {
    if (!value || typeof value !== 'object') return {};
    const result: Record<string, { complexity: string; note?: string; refs: string[] }> = {};
    for (const [key, raw] of Object.entries(value as Record<string, any>)) {
      if (!raw || typeof raw !== 'object') continue;
      const complexity = isString(raw.complexity) ? raw.complexity : 'unknown-to-us';
      const note = isString(raw.note) ? raw.note : undefined;
      const refs = sanitizeStringArray(raw.refs);
      const entry: { complexity: string; note?: string; refs: string[] } = {
        complexity,
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
      if (!isString(raw.label)) continue;
      results.push({
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
        if (!isString(raw.name) || !isString(raw.fullName) || !isString(raw.description)) {
          return null;
        }
        return {
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

  function sanitizeRelationships(value: unknown): RelationshipEntry[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const raw = entry as Record<string, any>;
        if (!isString(raw.sourceId) || !isString(raw.targetId) || !isString(raw.status)) return null;
        const relationship: RelationshipEntry = {
          sourceId: raw.sourceId,
          targetId: raw.targetId,
          status: raw.status,
          refs: sanitizeStringArray(raw.refs)
        };
        // Support separatingFunctionIds (new format)
        const ids = sanitizeStringArray(raw.separatingFunctionIds);
        if (ids.length > 0) {
          relationship.separatingFunctionIds = ids;
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
    description: relationship.description,
    refs: [...relationship.refs],
    separatingFunctionIds: relationship.separatingFunctionIds
      ? [...relationship.separatingFunctionIds]
      : undefined
  });

  const cloneSeparatingFunctionToAdd = (sf: SeparatingFunctionToAdd): SeparatingFunctionToAdd => ({
    shortName: sf.shortName,
    name: sf.name,
    description: sf.description,
    refs: [...sf.refs]
  });

  const cloneQueueEntry = (entry: ContributionQueueEntry): ContributionQueueEntry => {
    switch (entry.kind) {
      case 'language:new':
      case 'language:edit':
        return { ...entry, payload: cloneLanguageEntry(entry.payload) };
      case 'relationship':
        return { ...entry, payload: cloneRelationshipEntry(entry.payload) };
      case 'separator':
        return { ...entry, payload: cloneSeparatingFunctionToAdd(entry.payload) };
      case 'reference':
      default:
        return { ...entry, payload: entry.payload };
    }
  };

  function deriveQueueEntriesFromHistory(payload: SubmissionHistoryPayload): ContributionQueueEntry[] {
    if (!Array.isArray(payload.queueEntries) || payload.queueEntries.length === 0) {
      throw new Error('Submission history entry is missing queueEntries.');
    }
    return payload.queueEntries.map(cloneQueueEntry);
  }

  const createQueueEntryId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return uuidv4();
  };

  function addQueueEntry(entry: ContributionQueueEntry) {
    queueEntries = [...queueEntries, entry];
  }

  function updateQueueEntry<K extends ContributionQueueEntry['kind']>(
    entryId: string,
    kind: K,
    payload: Extract<ContributionQueueEntry, { kind: K }>['payload']
  ) {
    queueEntries = queueEntries.map((entry) => {
      if (entry.id === entryId && entry.kind === kind) {
        const updated = { ...entry, payload } as Extract<ContributionQueueEntry, { kind: K }>;
        return updated;
      }
      return entry;
    });
  }

  function removeQueueEntry(entryId: string) {
    queueEntries = queueEntries.filter((entry) => entry.id !== entryId);
  }

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

  const complexityOptions = Object.values(data.complexityOptions)
    .filter((option) => !option.internal);

  const statusOptions: Array<{
    value: string;
    label: string;
    description: string;
  }> = data.relationTypes
    .filter((type) => !data.complexityOptions[type.id]?.internal)
    .map((type) => ({
      value: type.id,
      label: type.name,
      description: type.description ?? ''
    }));

  // Build baseline relations from adjacency matrix
  const baselineRelations = buildBaselineRelations(data.adjacencyMatrix);

  // Contributor information
  let contributorEmail = $state('');
  let contributorGithub = $state('');
  let contributorNote = $state('');

  // Ordered queue of all contribution entries
  let queueEntries = $state<ContributionQueueEntry[]>([]);

  // Languages (derived from queue entries)
  let languagesToAdd = $state<QueueLanguage[]>([]);
  let languagesToEdit = $state<QueueLanguage[]>([]);

  // Relationships (always visible, works with existing + new languages)
  let relationships = $state<QueueRelationship[]>([]);

  // Track expanded state for chip UI
  let expandedLanguageToAddIndex = $state<number | null>(null);
  let expandedLanguageToEditIndex = $state<number | null>(null);
  let expandedRelationshipIndex = $state<number | null>(null);
  let expandedReferenceIndex = $state<number | null>(null);
  let expandedSeparatingFunctionIndex = $state<number | null>(null);

  // Modal visibility state
  let showAddLanguageModal = $state(false);
  let showEditLanguageModal = $state(false);
  let showLanguageSelectorModal = $state(false);
  let selectedLanguageToEdit = $state<string>('');
  let showAddReferenceModal = $state(false);
  let showAddSeparatingFunctionModal = $state(false);
  let showManageRelationshipModal = $state(false);
  let editReferenceIndex = $state<number | null>(null);
  let editSeparatingFunctionIndex = $state<number | null>(null);
  let editLanguageToAddIndex = $state<number | null>(null);
  let editLanguageToEditIndex = $state<number | null>(null);
  let editRelationshipIndex = $state<number | null>(null);

  // Track which relationships have been modified from baseline
  let modifiedRelations = $state(new Set<string>());
  let queuePersistenceReady = $state(false);

  // Additional state (declared before hasQueuedItems to avoid TDZ errors)
  let newReferences = $state<QueueReference[]>([]);
  let newSeparatingFunctions = $state<QueueSeparatingFunction[]>([]);
  let customTags = $state<CustomTag[]>([]);

  const languageAddPayloads = $derived(languagesToAdd.map((entry) => entry.payload));
  const languageEditPayloads = $derived(languagesToEdit.map((entry) => entry.payload));
  const referenceValues = $derived(newReferences.map((entry) => entry.bibtex));
  const separatingFunctionPayloads = $derived(newSeparatingFunctions.map((entry) => entry.payload));
  const relationshipPayloads = $derived(relationships.map((entry) => entry.payload));

  // Submission metadata & history
  let activeSubmissionId = $state('');
  let supersedesSubmissionId = $state<string | null>(null);
  let submissionHistory = $state<SubmissionHistoryEntry[]>([]);
  let isHistoryOpen = $state(false);


  // Derived state: check if queue has any items
  const hasQueuedItems = $derived(
    queueEntries.length > 0 ||
    customTags.length > 0 ||
    modifiedRelations.size > 0
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
      const stored = loadQueuedChanges();
      if (stored) {
        queueEntries = stored.entries.map(cloneQueueEntry);
        customTags = sanitizeTags(stored.customTags);
        modifiedRelations = new Set(sanitizeStringArray(stored.modifiedRelations));
        activeSubmissionId = sanitizeSubmissionId(stored.submissionId) ?? '';
        supersedesSubmissionId = sanitizeSubmissionId(stored.supersedesSubmissionId);
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
    const nextLanguagesToAdd: QueueLanguage[] = [];
    const nextLanguagesToEdit: QueueLanguage[] = [];
    const nextRelationships: QueueRelationship[] = [];
    const nextReferences: QueueReference[] = [];
    const nextSeparators: QueueSeparatingFunction[] = [];

    for (const entry of queueEntries) {
      switch (entry.kind) {
        case 'language:new':
          nextLanguagesToAdd.push({ queueEntryId: entry.id, payload: cloneLanguageEntry(entry.payload) });
          break;
        case 'language:edit':
          nextLanguagesToEdit.push({ queueEntryId: entry.id, payload: cloneLanguageEntry(entry.payload) });
          break;
        case 'relationship':
          nextRelationships.push({ queueEntryId: entry.id, payload: cloneRelationshipEntry(entry.payload) });
          break;
        case 'reference':
          nextReferences.push({ queueEntryId: entry.id, bibtex: entry.payload });
          break;
        case 'separator':
          nextSeparators.push({ queueEntryId: entry.id, payload: cloneSeparatingFunctionToAdd(entry.payload) });
          break;
        default:
          break;
      }
    }

    languagesToAdd = nextLanguagesToAdd;
    languagesToEdit = nextLanguagesToEdit;
    relationships = nextRelationships;
    newReferences = nextReferences;
    newSeparatingFunctions = nextSeparators;
  });

  $effect(() => {
    if (!queuePersistenceReady || !browser) return;

    if (!activeSubmissionId) {
      activeSubmissionId = createSubmissionId();
    }

    const isEmptyQueue =
      queueEntries.length === 0 &&
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
      entries: queueEntries.map(cloneQueueEntry),
      customTags: customTags.map(cloneCustomTag),
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

  // Build preview dataset snapshot for the main map
  $effect(() => {
    if (!queuePersistenceReady || !browser) return;

    if (!hasQueuedItems) {
      savePreviewDataset(null);
      return;
    }

    const queuePayload: ContributionQueueState = {
      entries: queueEntries.map(cloneQueueEntry),
      customTags: customTags.map(cloneCustomTag),
      modifiedRelations: Array.from(modifiedRelations),
      submissionId: activeSubmissionId,
      supersedesSubmissionId: supersedesSubmissionId ?? null
    };

    try {
      const dataset = applyContributionQueue(initialGraphData, queuePayload);
      savePreviewDataset(dataset);
    } catch (error) {
      console.error('Failed to build preview dataset:', error);
    }
  });

  // Modal handlers
  function handleAddLanguage(language: LanguageToAdd): OperationResult {
    addQueueEntry({ id: createQueueEntryId(), kind: 'language:new', payload: cloneLanguageEntry(language) });
    return { success: true };
  }

  function handleEditLanguage(language: LanguageToAdd): OperationResult {
    const existing = languagesToEdit.find((entry) => entry.payload.name === language.name);
    if (existing) {
      updateQueueEntry(existing.queueEntryId, 'language:edit', cloneLanguageEntry(language));
    } else {
      addQueueEntry({ id: createQueueEntryId(), kind: 'language:edit', payload: cloneLanguageEntry(language) });
    }
    return { success: true };
  }

  function handleAddReference(bibtex: string) {
    addQueueEntry({ id: createQueueEntryId(), kind: 'reference', payload: bibtex });
  }

  function handleAddSeparatingFunction(sf: SeparatingFunctionToAdd) {
    addQueueEntry({ id: createQueueEntryId(), kind: 'separator', payload: cloneSeparatingFunctionToAdd(sf) });
  }

  function handleEditSeparatingFunction(index: number) {
    editSeparatingFunctionIndex = index;
    showAddSeparatingFunctionModal = true;
  }

  function handleUpdateSeparatingFunction(sf: SeparatingFunctionToAdd) {
    if (editSeparatingFunctionIndex !== null) {
      const entry = newSeparatingFunctions[editSeparatingFunctionIndex];
      if (entry) {
        updateQueueEntry(entry.queueEntryId, 'separator', cloneSeparatingFunctionToAdd(sf));
      }
      editSeparatingFunctionIndex = null;
    }
  }

  function handleEditReference(index: number) {
    editReferenceIndex = index;
    showAddReferenceModal = true;
  }

  function handleUpdateReference(bibtex: string) {
    if (editReferenceIndex !== null) {
      const entry = newReferences[editReferenceIndex];
      if (entry) {
        updateQueueEntry(entry.queueEntryId, 'reference', bibtex);
      }
      editReferenceIndex = null;
    }
  }

  function handleEditLanguageToAdd(index: number) {
    // Open modal with current content
    editLanguageToAddIndex = index;
    showAddLanguageModal = true;
  }

  function handleUpdateLanguageToAdd(language: LanguageToAdd): OperationResult {
    if (editLanguageToAddIndex !== null) {
      const entry = languagesToAdd[editLanguageToAddIndex];
      if (entry) {
        updateQueueEntry(entry.queueEntryId, 'language:new', cloneLanguageEntry(language));
      }
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
      const entry = languagesToEdit[editLanguageToEditIndex];
      if (entry) {
        updateQueueEntry(entry.queueEntryId, 'language:edit', cloneLanguageEntry(language));
      }
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
      const entry = relationships[editRelationshipIndex];
      if (entry) {
        updateQueueEntry(entry.queueEntryId, 'relationship', cloneRelationshipEntry(relationship));
        recordModification(relationship);
      }

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
    const existing = relationships.find((entry) => relationKey(entry.payload.sourceId, entry.payload.targetId) === key);

    if (existing) {
      updateQueueEntry(existing.queueEntryId, 'relationship', cloneRelationshipEntry(relationship));
    } else {
      addQueueEntry({ id: createQueueEntryId(), kind: 'relationship', payload: cloneRelationshipEntry(relationship) });
    }

    recordModification(relationship);
  }

  function handleAddTag(tag: { label: string; color: string; description?: string; refs: string[] }) {
    customTags = [...customTags, tag];
  }

  function handleDeleteLanguageToAdd(index: number) {
    const entry = languagesToAdd[index];
    if (!entry) return;
    deleteLanguage(entry.queueEntryId, entry.payload.name);
  }

  function handleDeleteLanguageToEdit(index: number) {
    const entry = languagesToEdit[index];
    if (!entry) return;
    deleteLanguage(entry.queueEntryId, entry.payload.name);
  }

  function handleDeleteRelationship(index: number) {
    const entry = relationships[index];
    if (!entry) return;
    removeQueueEntry(entry.queueEntryId);
    clearModificationByKey(relationKey(entry.payload.sourceId, entry.payload.targetId));
  }

  // Cascade delete: when a language is deleted, remove its relationships
  function deleteLanguage(queueEntryId: string, langName: string) {
    // Generate the language ID from the name to match against relationships
    const langId = generateLanguageId(langName);
    const relatedRelationshipIds = relationships
      .filter((entry) => entry.payload.sourceId === langId || entry.payload.targetId === langId)
      .map((entry) => entry.queueEntryId);

    const idsToRemove = new Set([queueEntryId, ...relatedRelationshipIds]);
    queueEntries = queueEntries.filter((entry) => !idsToRemove.has(entry.id));

    updateModifiedRelations((current) => {
      if (current.size === 0) return current;
      const updated = new Set(current);
      for (const key of Array.from(updated)) {
        if (key.startsWith(`${langName}->`) || key.endsWith(`->${langName}`)) {
          updated.delete(key);
        }
      }
      return updated;
    });
  }

  // Cascade delete: when a reference is deleted, remove it from all dependencies
  function deleteReference(index: number) {
    const referenceEntry = newReferences[index];
    if (!referenceEntry) return;

    const existingIds = new Set(data.existingReferences.map((r) => r.id));
    for (let i = 0; i < index; i++) {
      const id = generateReferenceId(newReferences[i].bibtex, existingIds);
      existingIds.add(id);
    }

    const refId = generateReferenceId(referenceEntry.bibtex, existingIds);

    queueEntries = queueEntries.map((entry) => {
      if (entry.kind === 'language:new' || entry.kind === 'language:edit') {
        if (!entry.payload.descriptionRefs.includes(refId)) return entry;
        const updated = cloneLanguageEntry(entry.payload);
        updated.descriptionRefs = updated.descriptionRefs.filter((r) => r !== refId);
        return { ...entry, payload: updated };
      }

      if (entry.kind === 'relationship') {
        if (!entry.payload.refs.includes(refId)) {
          return entry;
        }
        const updated = cloneRelationshipEntry(entry.payload);
        updated.refs = updated.refs.filter((r) => r !== refId);
        return { ...entry, payload: updated };
      }

      if (entry.kind === 'separator') {
        if (!entry.payload.refs.includes(refId)) return entry;
        const updated = cloneSeparatingFunctionToAdd(entry.payload);
        updated.refs = updated.refs.filter((r) => r !== refId);
        return { ...entry, payload: updated };
      }

      return entry;
    });

    removeQueueEntry(referenceEntry.queueEntryId);

    customTags = customTags.map((tag) => ({ ...tag, refs: tag.refs.filter((r) => r !== refId) }));
  }

  function deleteSeparatingFunction(index: number) {
    const entry = newSeparatingFunctions[index];
    if (!entry) return;

    const shortName = entry.payload.shortName;
    removeQueueEntry(entry.queueEntryId);

    queueEntries = queueEntries.map((queueEntry) => {
      if (queueEntry.kind !== 'relationship' || !queueEntry.payload.separatingFunctionIds) {
        return queueEntry;
      }

      if (!queueEntry.payload.separatingFunctionIds.includes(shortName)) {
        return queueEntry;
      }

      const updated = cloneRelationshipEntry(queueEntry.payload);
      updated.separatingFunctionIds = (updated.separatingFunctionIds || []).filter((id) => id !== shortName);
      return { ...queueEntry, payload: updated };
    });
  }

  function toggleHistoryPanel() {
    const nextOpen = !isHistoryOpen;
    isHistoryOpen = nextOpen;
    if (nextOpen) {
      submissionHistory = loadSubmissionHistory();
    }
  }

  function loadSubmissionFromHistory(entry: SubmissionHistoryEntry) {
    try {
      const payload = entry.payload;

      queueEntries = deriveQueueEntriesFromHistory(payload);
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
      editLanguageToAddIndex = null;
      editLanguageToEditIndex = null;
      editRelationshipIndex = null;
      expandedLanguageToAddIndex = null;
      expandedLanguageToEditIndex = null;
      expandedRelationshipIndex = null;
      expandedReferenceIndex = null;
    } catch (error) {
      console.error('Failed to load submission from history', error);
      alert('Unable to load this submission. It was saved before ordered queues were supported.');
    }
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
      <p class="mt-4">
        <a href="https://github.com/dkahdian/kcm" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View on GitHub
        </a>
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
            languages={initialGraphData.languages}
            languagesToAdd={languageAddPayloads}
            languagesToEdit={languageEditPayloads}
            newReferences={referenceValues}
            newSeparatingFunctions={separatingFunctionPayloads}
            relationships={relationshipPayloads}
            {modifiedRelations}
            {expandedLanguageToAddIndex}
            {expandedLanguageToEditIndex}
            {expandedReferenceIndex}
            {expandedSeparatingFunctionIndex}
            {expandedRelationshipIndex}
            onToggleExpandLanguageToAdd={(index) => expandedLanguageToAddIndex = expandedLanguageToAddIndex === index ? null : index}
            onToggleExpandLanguageToEdit={(index) => expandedLanguageToEditIndex = expandedLanguageToEditIndex === index ? null : index}
            onToggleExpandReference={(index) => expandedReferenceIndex = expandedReferenceIndex === index ? null : index}
            onToggleExpandSeparatingFunction={(index) => expandedSeparatingFunctionIndex = expandedSeparatingFunctionIndex === index ? null : index}
            onToggleExpandRelationship={(index) => expandedRelationshipIndex = expandedRelationshipIndex === index ? null : index}
            onEditLanguageToAdd={handleEditLanguageToAdd}
            onEditLanguageToEdit={handleEditLanguageToEdit}
            onDeleteLanguageToAdd={handleDeleteLanguageToAdd}
            onDeleteLanguageToEdit={handleDeleteLanguageToEdit}
            onEditReference={handleEditReference}
            onDeleteReference={deleteReference}
            onEditSeparatingFunction={handleEditSeparatingFunction}
            onDeleteSeparatingFunction={deleteSeparatingFunction}
            onEditRelationship={handleEditRelationship}
            onDeleteRelationship={(index) => handleDeleteRelationship(index)}
          />
          <!-- END Queued Items Section -->

          <!-- Action Buttons -->
          <ActionButtons
            onAddLanguage={() => showAddLanguageModal = true}
            onEditLanguage={() => showLanguageSelectorModal = true}
            onManageRelationships={() => showManageRelationshipModal = true}
            onAddReference={() => showAddReferenceModal = true}
            onAddSeparatingFunction={() => showAddSeparatingFunctionModal = true}
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
  initialData={editLanguageToAddIndex !== null ? languagesToAdd[editLanguageToAddIndex]?.payload : undefined}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  complexityOptions={complexityOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={getAvailableReferenceIds(data.existingReferences, referenceValues)}
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
  initialData={editLanguageToEditIndex !== null ? languagesToEdit[editLanguageToEditIndex]?.payload : (selectedLanguageToEdit ? convertLanguageForEdit(data.languages.find(l => l.name === selectedLanguageToEdit)!) : undefined)}
  queries={Object.values(data.queries).map(q => ({ code: q.code, name: q.label }))}
  transformations={Object.values(data.transformations).map(t => ({ code: t.code, name: t.label }))}
  complexityOptions={complexityOptions.map(p => ({ value: p.code, label: p.label, description: p.description || '' }))}
  existingTags={[...data.existingTags, ...customTags].map(t => ({ label: t.label, color: t.color || '#6366f1', description: '', refs: [] }))}
  availableRefs={getAvailableReferenceIds(data.existingReferences, referenceValues)}
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
            <option value={lang.name}>{lang.name}</option>
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
  }}
  onAdd={editReferenceIndex !== null ? handleUpdateReference : handleAddReference}
  initialValue={editReferenceIndex !== null ? newReferences[editReferenceIndex]?.bibtex ?? '' : ''}
  isEditMode={editReferenceIndex !== null}
/>

<AddSeparatingFunctionModal
  bind:isOpen={showAddSeparatingFunctionModal}
  onClose={() => {
    showAddSeparatingFunctionModal = false;
    editSeparatingFunctionIndex = null;
  }}
  onAdd={editSeparatingFunctionIndex !== null ? handleUpdateSeparatingFunction : handleAddSeparatingFunction}
  initialValue={editSeparatingFunctionIndex !== null ? newSeparatingFunctions[editSeparatingFunctionIndex]?.payload : undefined}
  availableRefs={getAvailableReferenceIds(data.existingReferences, referenceValues)}
  isEditMode={editSeparatingFunctionIndex !== null}
/>

<ManageRelationshipModal
  bind:isOpen={showManageRelationshipModal}
  onClose={() => {
    showManageRelationshipModal = false;
    editRelationshipIndex = null;
  }}
  onSave={handleSaveRelationship}
  initialData={editRelationshipIndex !== null ? relationships[editRelationshipIndex]?.payload : undefined}
  languages={getAvailableLanguages(data.languages, languageAddPayloads, languageEditPayloads)}
  {statusOptions}
  availableRefs={getAvailableReferenceIds(data.existingReferences, referenceValues)}
  availableSeparatingFunctions={getAvailableSeparatingFunctions(data.existingSeparatingFunctions, separatingFunctionPayloads)}
  {baselineRelations}
/>

<style>
  :global(body) {
    margin: 0;
  }
</style>
