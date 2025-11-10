<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { loadHistory, type ContributionHistoryEntry } from '$lib/utils/history.js';

  let countdown = $state(10);
  let latestSubmission = $state<ContributionHistoryEntry | null>(null);

  onMount(() => {
    // Load the most recent submission from history
    const history = loadHistory();
    if (history.length > 0) {
      // Sort by updatedAt to get the most recent
      const sorted = [...history].sort((a, b) => b.updatedAt - a.updatedAt);
      latestSubmission = sorted[0];
    }

    const interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
        goto('/');
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<svelte:head>
  <title>Contribution Submitted - StarAI KC Map</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
  <div class="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
    <div class="text-center">
      <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 class="text-3xl font-bold text-gray-900 mb-4">Thank You for Your Contribution! 🎉</h1>

      <p class="text-lg text-gray-700 mb-6">
        Your contribution has been successfully submitted and is now being processed.
      </p>

      {#if latestSubmission}
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6 mb-6 text-left">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Submission Details</h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Submission ID:</span>
              <div class="flex items-center gap-2">
                <code class="px-2 py-1 bg-white rounded font-mono text-xs">
                  {latestSubmission.submissionId.substring(0, 8)}...
                </code>
                <button
                  onclick={() => copyToClipboard(latestSubmission!.submissionId)}
                  class="p-1 hover:bg-indigo-100 rounded transition-colors"
                  title="Copy full ID"
                  aria-label="Copy submission ID to clipboard"
                >
                  <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            {#if latestSubmission.prNumber}
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Pull Request:</span>
                <a
                  href="https://github.com/dkahdian/kcm/pull/{latestSubmission.prNumber}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  #{latestSubmission.prNumber} ↗
                </a>
              </div>
            {/if}
            {#if latestSubmission.previewUrl}
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Preview:</span>
                <a
                  href={latestSubmission.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View Preview ↗
                </a>
              </div>
            {/if}
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Status:</span>
              <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                {latestSubmission.status === 'pending' ? 'Processing' : latestSubmission.status}
              </span>
            </div>
          </div>
        </div>
      {/if}

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">What happens next?</h2>
        <ol class="space-y-3 text-gray-700">
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <span>
              <strong>Automated Processing:</strong> GitHub Actions will generate the necessary code files from your contribution.
            </span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <span>
              <strong>Pull Request Creation:</strong> A pull request will be automatically created in
              the repository with your changes.
            </span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <span>
              <strong>Review Process:</strong> The maintainers will review your contribution for accuracy
              and completeness.
            </span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              4
            </span>
            <span>
              <strong>Merge & Deploy:</strong> Once approved, your contribution will be merged and
              deployed to the live site!
            </span>
          </li>
        </ol>
      </div>

      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
        <p class="text-sm text-gray-700">
          <strong>Note:</strong> The review process typically takes a few days. You'll receive updates
          via email if you provided one, or you can check the repository's pull requests page.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/"
          class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
        >
          Return to Home
        </a>
        <a
          href="/contribute"
          class="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
        >
          Submit Another Contribution
        </a>
      </div>

      <p class="text-sm text-gray-500 mt-6">
        Automatically redirecting to home in {countdown} second{countdown !== 1 ? 's' : ''}...
      </p>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
  }
</style>
