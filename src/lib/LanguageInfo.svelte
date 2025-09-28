<script lang="ts">
  import type { KCLanguage } from './types.js';
  
  let { selectedLanguage }: { selectedLanguage: KCLanguage | null } = $props();
</script>

{#if selectedLanguage}
  <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4" style="max-width: 100%;">
    <h3 class="text-xl font-bold text-gray-900 mb-2">{selectedLanguage.name}</h3>
    <h4 class="text-sm text-gray-600 mb-4">{selectedLanguage.fullName}</h4>
    
    <p class="text-gray-700 mb-6">{selectedLanguage.description}</p>
    
    <div class="space-y-4">
      <div>
        <h5 class="font-semibold text-gray-900 mb-2">Polynomial-Time Queries</h5>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.CO ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">CO (Consistency)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.VA ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">VA (Validity)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.CE ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">CE (Clausal Entailment)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.IM ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">IM (Implicant)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.EQ ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">EQ (Equivalence)</span>
          </div>
        </div>
      </div>
      
      <div>
        <h5 class="font-semibold text-gray-900 mb-2">Polynomial-Time Transformations</h5>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.SU ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">SU (Conditioning)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.CD ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">CD (Conjunction)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full {selectedLanguage.properties.FO ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm">FO (Forgetting)</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-gray-200">
      <p class="text-xs text-gray-500">
        Click on other nodes to explore different knowledge compilation languages.
      </p>
    </div>
  </div>
{:else}
  <div class="bg-gray-50 border border-gray-200 rounded-lg p-4" style="max-width: 100%;">
    <h3 class="text-lg font-semibold text-gray-700 mb-2">Knowledge Compilation Map</h3>
    <p class="text-gray-600 text-sm mb-4">
      Click on any node in the graph to view detailed information about that knowledge compilation language.
    </p>
    <div class="space-y-2 text-xs text-gray-500">
      <p><span class="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>Polynomial-time operation</p>
      <p><span class="w-2 h-2 bg-red-500 rounded-full inline-block mr-2"></span>Exponential-time operation</p>
    </div>
  </div>
  <div class="legend">
    <h4>Legend</h4>
    <div class="legend-row"><span class="line line-primary"></span><span>Succinctness (A ≤ B)</span></div>
    <div class="legend-row"><span class="line line-danger dashed"></span><span>Incomparable (A || B)</span></div>
    <div class="legend-row"><span class="line line-success"></span><span>Equivalence (A ≡ B)</span></div>
  </div>
  <style>/* Legend */
    .legend { margin-top: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
    .legend h4 { margin: 0 0 0.5rem; font-weight: 600; color: #111827; }
    .legend-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #374151; }
    .line { display: inline-block; width: 1.25rem; height: 2px; background: #1e40af; }
    .line-primary { background: #1e40af; }
    .line-danger { background: #dc2626; }
    .line-success { background: #059669; }
    .dashed { border-top: 2px dashed #dc2626; height: 0; background: transparent; }
  </style>
{/if}