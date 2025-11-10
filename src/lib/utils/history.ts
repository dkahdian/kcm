/**
 * Contribution History Manager
 * 
 * Manages persistent storage of contribution submissions in localStorage,
 * allowing users to track their PR history and reload past contributions
 * for editing.
 */

import { browser } from '$app/environment';

const HISTORY_STORAGE_KEY = 'kcm_contribution_history_v1';
const MAX_HISTORY_ENTRIES = 25;

export type ContributionStatus = 'pending' | 'open' | 'merged' | 'closed' | 'error';

export interface PersistedQueueState {
  languagesToAdd: any[];
  languagesToEdit: any[];
  relationships: any[];
  newReferences: string[];
  customTags: any[];
  modifiedRelations: string[];
}

export interface ContributionHistoryEntry {
  submissionId: string;
  createdAt: number; // ms timestamp
  updatedAt: number;
  contributor: {
    email: string;
    github?: string;
  };
  prNumber?: number;
  branchName?: string;
  previewUrl?: string;
  status: ContributionStatus;
  queueSnapshot: PersistedQueueState;
  errorMessage?: string;
}

/**
 * Load all history entries from localStorage
 */
export function loadHistory(): ContributionHistoryEntry[] {
  if (!browser) return [];

  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.error('Failed to load contribution history:', error);
    return [];
  }
}

/**
 * Save history entries to localStorage
 */
export function saveHistory(entries: ContributionHistoryEntry[]): void {
  if (!browser) return;

  try {
    // Prune to max entries (keep most recent)
    const pruned = entries
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_HISTORY_ENTRIES);

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pruned));
  } catch (error) {
    console.error('Failed to save contribution history:', error);
  }
}

/**
 * Add a new history entry
 */
export function addHistoryEntry(entry: ContributionHistoryEntry): void {
  const history = loadHistory();
  history.push(entry);
  saveHistory(history);
}

/**
 * Update an existing history entry by submission ID
 */
export function updateHistoryEntry(
  submissionId: string,
  updates: Partial<Omit<ContributionHistoryEntry, 'submissionId'>>
): void {
  const history = loadHistory();
  const index = history.findIndex((e) => e.submissionId === submissionId);

  if (index >= 0) {
    history[index] = {
      ...history[index],
      ...updates,
      updatedAt: Date.now()
    };
    saveHistory(history);
  }
}

/**
 * Get a single history entry by submission ID
 */
export function getHistoryEntry(submissionId: string): ContributionHistoryEntry | null {
  const history = loadHistory();
  return history.find((e) => e.submissionId === submissionId) || null;
}

/**
 * Delete a history entry by submission ID
 */
export function deleteHistoryEntry(submissionId: string): void {
  const history = loadHistory();
  const filtered = history.filter((e) => e.submissionId !== submissionId);
  saveHistory(filtered);
}

/**
 * Clear all history entries
 */
export function clearHistory(): void {
  if (!browser) return;
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

/**
 * Export history as JSON string for backup
 */
export function exportHistory(): string {
  const history = loadHistory();
  return JSON.stringify(history, null, 2);
}

/**
 * Import history from JSON string
 */
export function importHistory(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Invalid format: expected array' };
    }

    // Validate structure
    for (const entry of parsed) {
      if (!entry.submissionId || !entry.createdAt || !entry.queueSnapshot) {
        return { success: false, error: 'Invalid entry structure' };
      }
    }

    saveHistory(parsed);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate preview URL from PR number
 */
export function getPreviewUrl(prNumber: number): string {
  return `https://kcm.kahdian.com/previews/pr-${prNumber}/`;
}

/**
 * Generate GitHub PR URL
 */
export function getPRUrl(prNumber: number, owner = 'dkahdian', repo = 'kcm'): string {
  return `https://github.com/${owner}/${repo}/pull/${prNumber}`;
}

/**
 * Truncate submission ID for display
 */
export function truncateSubmissionId(id: string, length = 8): string {
  return id.substring(0, length);
}
