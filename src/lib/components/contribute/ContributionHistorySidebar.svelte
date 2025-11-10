<script lang="ts">
  import type { ContributionHistoryEntry } from '$lib/utils/history.js';
  import { truncateSubmissionId, getPreviewUrl, getPRUrl } from '$lib/utils/history.js';

  interface Props {
    entries: ContributionHistoryEntry[];
    onLoad: (entry: ContributionHistoryEntry) => void;
    onUpdate: (entry: ContributionHistoryEntry) => void;
    onDelete: (submissionId: string) => void;
    onRefreshStatus: (submissionId: string) => void;
  }

  let { entries, onLoad, onUpdate, onDelete, onRefreshStatus }: Props = $props();

  function getStatusColor(status: ContributionHistoryEntry['status']): string {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'merged':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  }

  function getStatusLabel(status: ContributionHistoryEntry['status']): string {
    switch (status) {
      case 'open':
        return 'Open';
      case 'merged':
        return 'Merged';
      case 'closed':
        return 'Closed';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    // Show full date
    return date.toLocaleDateString();
  }

  let expandedIndex = $state<number | null>(null);

  function toggleExpand(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }
</script>

<div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
  <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
    <h3 class="text-xl font-bold text-white">Contribution History</h3>
    <p class="text-indigo-100 text-sm mt-1">
      {entries.length} {entries.length === 1 ? 'submission' : 'submissions'}
    </p>
  </div>

  <div class="max-h-[600px] overflow-y-auto">
    {#if entries.length === 0}
      <div class="p-8 text-center text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium mb-2">No contributions yet</p>
        <p class="text-sm">Your submission history will appear here</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each entries as entry, index (entry.submissionId)}
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span class={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(entry.status)}`}>
                    {getStatusLabel(entry.status)}
                  </span>
                  {#if entry.prNumber}
                    <span class="text-xs text-gray-500">PR #{entry.prNumber}</span>
                  {/if}
                </div>

                <div class="text-sm text-gray-900 mb-1">
                  <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {truncateSubmissionId(entry.submissionId)}
                  </span>
                </div>

                <div class="text-xs text-gray-500">
                  {formatDate(entry.updatedAt)}
                </div>

                {#if entry.errorMessage}
                  <div class="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {entry.errorMessage}
                  </div>
                {/if}
              </div>

              <button
                onclick={() => toggleExpand(index)}
                class="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label={expandedIndex === index ? 'Collapse' : 'Expand'}
              >
                <svg
                  class="w-5 h-5 text-gray-600 transition-transform"
                  class:rotate-180={expandedIndex === index}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {#if expandedIndex === index}
              <div class="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <button
                    onclick={() => onLoad(entry)}
                    class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Load into Queue
                  </button>

                  {#if entry.status === 'open' || entry.status === 'error'}
                    <button
                      onclick={() => onUpdate(entry)}
                      class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Update PR
                    </button>
                  {:else}
                    <button
                      disabled
                      class="px-3 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                    >
                      Update PR
                    </button>
                  {/if}
                </div>

                <div class="flex gap-2">
                  {#if entry.prNumber}
                    <a
                      href={getPRUrl(entry.prNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center text-sm font-medium"
                    >
                      View PR ↗
                    </a>
                  {/if}

                  {#if entry.previewUrl}
                    <a
                      href={entry.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center text-sm font-medium"
                    >
                      Preview ↗
                    </a>
                  {/if}
                </div>

                <div class="flex gap-2">
                  <button
                    onclick={() => onRefreshStatus(entry.submissionId)}
                    class="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Refresh Status
                  </button>

                  <button
                    onclick={() => {
                      if (confirm('Delete this history entry? This cannot be undone.')) {
                        onDelete(entry.submissionId);
                      }
                    }}
                    class="px-3 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
