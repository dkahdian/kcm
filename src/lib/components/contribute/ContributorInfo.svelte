<script lang="ts">
  let { 
    email = $bindable(''),
    github = $bindable('')
  } = $props();
</script>

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
        bind:value={email}
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
        bind:value={github}
        class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="@username"
      />
    </div>
  </div>
</div>
