<script lang="ts">
  /**
   * Preview button - redirects to main page to show preview of queued changes
   */
  let {
    disabled = false
  }: {
    disabled?: boolean;
  } = $props();
</script>

<div class="pt-6">
  <button
    type="submit"
    {disabled}
    class="group relative w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-bold text-lg rounded-xl hover:from-indigo-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
  >
    <span class="flex items-center justify-center">
      <svg class="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      Preview Submission
    </span>
  </button>
  <p class="text-center text-sm text-gray-500 mt-4">
    Preview your changes before submitting
  </p>
</div>
