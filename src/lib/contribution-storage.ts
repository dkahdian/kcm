import type { CanonicalKCData } from './types.js';
import type { ContributionQueueEntry, ContributionQueueState } from './data/contribution-transforms.js';
import type {
  ContributorInfo,
  LanguageToAdd,
  RelationshipEntry,
  SeparatingFunctionToAdd
} from '../routes/contribute/types.js';

export const QUEUE_STORAGE_KEY = 'kcm_contribute_queue_v1';
export const CONTRIBUTOR_STORAGE_KEY = 'kcm_contributor_info_v1';
export const PREVIEW_DATASET_STORAGE_KEY = 'kcm_contribute_preview_dataset_v1';

function getStoredValue(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function setStoredValue(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

function removeStoredValue(key: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export function hasQueuedChanges(): boolean {
  return getStoredValue(QUEUE_STORAGE_KEY) !== null;
}

export interface ContributionQueueSnapshot extends ContributionQueueState {
  languagesToAdd: LanguageToAdd[];
  languagesToEdit: LanguageToAdd[];
  relationships: RelationshipEntry[];
  newReferences: string[];
  newSeparatingFunctions: SeparatingFunctionToAdd[];
}

function normalizeEntries(parsed: any): ContributionQueueEntry[] {
  if (Array.isArray(parsed?.entries)) {
    return parsed.entries as ContributionQueueEntry[];
  }

  const legacyEntries: ContributionQueueEntry[] = [];
  const push = (entry: ContributionQueueEntry) => legacyEntries.push(entry);

  (parsed?.newReferences || []).forEach((bibtex: string, idx: number) => {
    push({ id: `legacy-ref-${idx}`, kind: 'reference', payload: bibtex });
  });
  (parsed?.newSeparatingFunctions || []).forEach((sf: SeparatingFunctionToAdd, idx: number) => {
    push({ id: `legacy-sep-${idx}`, kind: 'separator', payload: sf });
  });
  (parsed?.languagesToAdd || []).forEach((lang: LanguageToAdd, idx: number) => {
    push({ id: `legacy-lang-add-${idx}`, kind: 'language:new', payload: lang });
  });
  (parsed?.languagesToEdit || []).forEach((lang: LanguageToAdd, idx: number) => {
    push({ id: `legacy-lang-edit-${idx}`, kind: 'language:edit', payload: lang });
  });
  (parsed?.relationships || []).forEach((rel: RelationshipEntry, idx: number) => {
    push({ id: `legacy-rel-${idx}`, kind: 'relationship', payload: rel });
  });

  if (legacyEntries.length > 0) {
    console.warn('Loaded queue data without ordered entries; falling back to best-effort legacy ordering.');
  }

  return legacyEntries;
}

export function loadQueuedChanges(): ContributionQueueSnapshot | null {
  const stored = getStoredValue(QUEUE_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const snapshot: ContributionQueueSnapshot = {
      entries: normalizeEntries(parsed),
      languagesToAdd: parsed.languagesToAdd || [],
      languagesToEdit: parsed.languagesToEdit || [],
      relationships: parsed.relationships || [],
      newReferences: parsed.newReferences || [],
      newSeparatingFunctions: parsed.newSeparatingFunctions || [],
      customTags: parsed.customTags || [],
      modifiedRelations: parsed.modifiedRelations || [],
      submissionId: typeof parsed.submissionId === 'string' ? parsed.submissionId : undefined,
      supersedesSubmissionId:
        typeof parsed.supersedesSubmissionId === 'string' ? parsed.supersedesSubmissionId : null
    };
    return snapshot;
  } catch (error) {
    console.error('Failed to load queued changes:', error);
    return null;
  }
}

export function clearQueuedChanges(): void {
  removeStoredValue(QUEUE_STORAGE_KEY);
  removeStoredValue(PREVIEW_DATASET_STORAGE_KEY);
  removeStoredValue(CONTRIBUTOR_STORAGE_KEY);
}

export function loadContributorInfo(): ContributorInfo | null {
  const stored = getStoredValue(CONTRIBUTOR_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ContributorInfo;
  } catch (error) {
    console.error('Failed to load contributor info:', error);
    return null;
  }
}

export function savePreviewDataset(dataset: CanonicalKCData | null): void {
  if (dataset === null) {
    removeStoredValue(PREVIEW_DATASET_STORAGE_KEY);
    return;
  }
  try {
    setStoredValue(PREVIEW_DATASET_STORAGE_KEY, JSON.stringify(dataset));
  } catch (error) {
    console.error('Failed to persist preview dataset:', error);
  }
}

export function loadPreviewDataset(): CanonicalKCData | null {
  const stored = getStoredValue(PREVIEW_DATASET_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as CanonicalKCData;
  } catch (error) {
    console.error('Failed to load preview dataset:', error);
    return null;
  }
}
