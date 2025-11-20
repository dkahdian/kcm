<script lang="ts">
  let {
    onAddLanguage,
    onEditLanguage,
    onAddRelationship,
    onEditRelationship,
    onAddReference,
    onAddSeparatingFunction,
    onAddTag
  }: {
    onAddLanguage: () => void;
    onEditLanguage: () => void;
    onAddRelationship: () => void;
    onEditRelationship: () => void;
    onAddReference: () => void;
    onAddSeparatingFunction: () => void;
    onAddTag: () => void;
  } = $props();
</script>

<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
  <button
    type="button"
    onclick={onAddLanguage}
    class="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
  >
    + New Language
  </button>
  
  <button
    type="button"
    onclick={onEditLanguage}
    class="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
  >
    ✎ Edit Language
  </button>
  
  <button
    type="button"
    onclick={onAddRelationship}
    class="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
  >
    + New Relationship
  </button>
  
  <button
    type="button"
    onclick={onEditRelationship}
    class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
  >
    ✎ Edit Relationship
  </button>
  
  <button
    type="button"
    onclick={onAddReference}
    class="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
  >
    + New Reference
  </button>
  
  <button
    type="button"
    onclick={onAddSeparatingFunction}
    class="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
  >
    + New Separating Function
  </button>
  
  <button
    type="button"
    onclick={onAddTag}
    class="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition-colors"
  >
    + New Tag
  </button>
</div>
