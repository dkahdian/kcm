import type { CustomTag, LanguageToAdd, RelationshipEntry, SubmissionHistoryEntry, SubmissionHistoryPayload } from '../../routes/contribute/types.js';

const HISTORY_STORAGE_KEY = 'kcm_submission_history_v1';
const MAX_ENTRIES = 10;

const isArray = Array.isArray;

function cloneLanguages(items: LanguageToAdd[]): LanguageToAdd[] {
  return items.map((item) => ({
    ...item,
    descriptionRefs: [...item.descriptionRefs],
    queries: Object.fromEntries(
      Object.entries(item.queries).map(([code, support]) => [code, { ...support, refs: [...support.refs] }])
    ),
    transformations: Object.fromEntries(
      Object.entries(item.transformations).map(([code, support]) => [code, { ...support, refs: [...support.refs] }])
    ),
    tags: item.tags.map((tag) => ({ ...tag, refs: [...tag.refs] })),
    existingReferences: [...item.existingReferences]
  }));
}

function cloneRelationships(items: RelationshipEntry[]): RelationshipEntry[] {
  return items.map((item) => ({
    ...item,
    refs: [...item.refs],
    separatingFunctions: item.separatingFunctions
      ? item.separatingFunctions.map((fn) => ({ ...fn, refs: [...fn.refs] }))
      : undefined
  }));
}

function cloneTags(items: CustomTag[]): CustomTag[] {
  return items.map((tag) => ({ ...tag, refs: [...tag.refs] }));
}

function sanitizeHistoryEntry(raw: unknown): SubmissionHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  const id = typeof entry.id === 'string' ? entry.id : null;
  const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : null;
  if (!id || !createdAt) return null;

  const payloadRaw = entry.payload as Record<string, unknown> | undefined;
  if (!payloadRaw || typeof payloadRaw !== 'object') return null;

  const submissionId = typeof payloadRaw.submissionId === 'string' ? payloadRaw.submissionId : id;
  const supersedesSubmissionId = typeof payloadRaw.supersedesSubmissionId === 'string' ? payloadRaw.supersedesSubmissionId : null;
  const contributorRaw = payloadRaw.contributor as Record<string, unknown> | undefined;
  const contributor = contributorRaw && typeof contributorRaw === 'object'
    ? {
        email: typeof contributorRaw.email === 'string' ? contributorRaw.email : '',
        github: typeof contributorRaw.github === 'string' ? contributorRaw.github : '',
        note: typeof contributorRaw.note === 'string' ? contributorRaw.note : ''
      }
    : { email: '', github: '', note: '' };

  const asLanguageArray = (value: unknown): LanguageToAdd[] =>
    isArray(value)
      ? cloneLanguages(
          value.filter((item): item is LanguageToAdd => !!item && typeof item === 'object') as LanguageToAdd[]
        )
      : [];

  const asRelationshipArray = (value: unknown): RelationshipEntry[] =>
    isArray(value)
      ? cloneRelationships(
          value.filter((item): item is RelationshipEntry => !!item && typeof item === 'object') as RelationshipEntry[]
        )
      : [];

  const asStringArray = (value: unknown): string[] =>
    isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const asTagArray = (value: unknown): CustomTag[] =>
    isArray(value)
      ? cloneTags(value.filter((item): item is CustomTag => !!item && typeof item === 'object') as CustomTag[])
      : [];

  const payload: SubmissionHistoryPayload = {
    submissionId,
    supersedesSubmissionId,
    languagesToAdd: asLanguageArray(payloadRaw.languagesToAdd),
    languagesToEdit: asLanguageArray(payloadRaw.languagesToEdit),
    relationships: asRelationshipArray(payloadRaw.relationships),
    newReferences: asStringArray(payloadRaw.newReferences),
    customTags: asTagArray(payloadRaw.customTags),
    modifiedRelations: asStringArray(payloadRaw.modifiedRelations),
    contributor
  };

  const summaryRaw = entry.summary as Record<string, unknown> | undefined;
  const summary = summaryRaw && typeof summaryRaw === 'object'
    ? {
        languagesToAdd: Number(summaryRaw.languagesToAdd) || payload.languagesToAdd.length,
        languagesToEdit: Number(summaryRaw.languagesToEdit) || payload.languagesToEdit.length,
        relationships: Number(summaryRaw.relationships) || payload.relationships.length,
        newReferences: Number(summaryRaw.newReferences) || payload.newReferences.length
      }
    : {
        languagesToAdd: payload.languagesToAdd.length,
        languagesToEdit: payload.languagesToEdit.length,
        relationships: payload.relationships.length,
        newReferences: payload.newReferences.length
      };

  const supersededBySubmissionId = typeof entry.supersededBySubmissionId === 'string' ? entry.supersededBySubmissionId : undefined;

  return {
    id,
    createdAt,
    summary,
    payload,
    supersedesSubmissionId,
    supersededBySubmissionId
  };
}

function sanitizeHistory(raw: unknown): SubmissionHistoryEntry[] {
  if (!isArray(raw)) return [];
  const cleaned = raw
    .map((item) => sanitizeHistoryEntry(item))
    .filter((item): item is SubmissionHistoryEntry => item !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return cleaned.slice(0, MAX_ENTRIES);
}

export function loadSubmissionHistory(): SubmissionHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeHistory(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load submission history', error);
    return [];
  }
}

export function saveSubmissionHistory(entries: SubmissionHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch (error) {
    console.warn('Failed to save submission history', error);
  }
}

export function createSubmissionHistoryEntry(payload: SubmissionHistoryPayload): SubmissionHistoryEntry {
  const createdAt = new Date().toISOString();
  return {
    id: payload.submissionId,
    createdAt,
    summary: {
      languagesToAdd: payload.languagesToAdd.length,
      languagesToEdit: payload.languagesToEdit.length,
      relationships: payload.relationships.length,
      newReferences: payload.newReferences.length
    },
    payload: {
      ...payload,
      languagesToAdd: cloneLanguages(payload.languagesToAdd),
      languagesToEdit: cloneLanguages(payload.languagesToEdit),
      relationships: cloneRelationships(payload.relationships),
      newReferences: [...payload.newReferences],
      customTags: cloneTags(payload.customTags),
      modifiedRelations: [...payload.modifiedRelations],
      contributor: { ...payload.contributor }
    },
    supersedesSubmissionId: payload.supersedesSubmissionId ?? null,
    supersededBySubmissionId: undefined
  };
}

export function recordSubmissionHistory(payload: SubmissionHistoryPayload): SubmissionHistoryEntry[] {
  const existing = loadSubmissionHistory();
  const entry = createSubmissionHistoryEntry(payload);
  const filtered = existing.filter((item) => item.id !== entry.id);

  if (entry.supersedesSubmissionId) {
    const superseded = filtered.find((item) => item.id === entry.supersedesSubmissionId);
    if (superseded) {
      superseded.supersededBySubmissionId = entry.id;
    }
  }

  const next = [entry, ...filtered];
  const capped = next.slice(0, MAX_ENTRIES);
  saveSubmissionHistory(capped);
  return capped;
}

export function markSubmissionAsSuperseded(supersededId: string, newSubmissionId: string): SubmissionHistoryEntry[] {
  const entries = loadSubmissionHistory();
  const target = entries.find((item) => item.id === supersededId);
  if (target) {
    target.supersededBySubmissionId = newSubmissionId;
    saveSubmissionHistory(entries);
  }
  return entries;
}
