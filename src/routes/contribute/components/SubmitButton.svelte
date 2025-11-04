<script lang="ts">
  /**
   * Submit button with loading state
   */
  let {
    submitting = false
  }: {
    submitting?: boolean;
  } = $props();
</script>

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
