<script lang="ts">
  import type { KCLanguage, KCOpEntry } from './types.js';
  
  let { selectedLanguage }: { selectedLanguage: KCLanguage | null } = $props();

  const statusColor = (op: KCOpEntry) => {
    switch (op.polytime) {
      case 'true': return '#22c55e';
      case 'false': return '#ef4444';
      default: return '#f59e0b';
    }
  };
</script>

{#if selectedLanguage}
  <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4" style="max-width: 100%;">
    <h3 class="text-xl font-bold text-gray-900 mb-2">{selectedLanguage.name}</h3>
    <h4 class="text-sm text-gray-600 mb-4">{selectedLanguage.fullName}</h4>
    
    <p class="text-gray-700 mb-6">{selectedLanguage.description}</p>

    {#if selectedLanguage.tags?.length}
      <div class="mb-4 flex flex-wrap gap-2">
        {#each selectedLanguage.tags as tag}
          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={`background:${tag.color ?? '#e5e7eb'}20; color:${tag.color ?? '#374151'}; border:1px solid ${tag.color ?? '#e5e7eb'}`}
            title={tag.description || ''}>
            {tag.label}
          </span>
        {/each}
      </div>
    {/if}
    
    <div class="space-y-4">
      <div>
        <h5 class="font-semibold text-gray-900 mb-2">Queries</h5>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          {#each selectedLanguage.properties.queries ?? [] as q}
            <div class="grid grid-cols-[auto,1fr] items-start gap-x-2">
              <span class="inline-block w-3 h-3 rounded-full mt-[2px] shrink-0" style={`background:${statusColor(q)}`}></span>
              <div class="text-sm leading-5">
                <div><strong>{q.code}</strong>{q.label ? ` (${q.label})` : ''}</div>
                {#if q.note}
                  <div class="text-xs text-gray-500">{q.note}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div>
        <h5 class="font-semibold text-gray-900 mb-2">Transformations</h5>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          {#each selectedLanguage.properties.transformations ?? [] as t}
            <div class="grid grid-cols-[auto,1fr] items-start gap-x-2">
              <span class="inline-block w-3 h-3 rounded-full mt-[2px] shrink-0" style={`background:${statusColor(t)}`}></span>
              <div class="text-sm leading-5">
                <div><strong>{t.code}</strong>{t.label ? ` (${t.label})` : ''}</div>
                {#if t.note}
                  <div class="text-xs text-gray-500">{t.note}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-gray-200">
      {#if selectedLanguage.references?.length}
        <div class="mb-2">
          <h6 class="text-xs font-semibold text-gray-700 mb-1">References</h6>
          <ul class="list-disc pl-4 space-y-1">
            {#each selectedLanguage.references as ref}
              <li class="text-xs"><a class="underline text-blue-700" href={ref.href} target="_blank" rel="noreferrer noopener">{ref.title}</a></li>
            {/each}
          </ul>
        </div>
      {/if}
      <p class="text-xs text-gray-500">Click on other nodes to explore different knowledge compilation languages.</p>
    </div>
  </div>
{:else}
  <div class="bg-gray-50 border border-gray-200 rounded-lg p-4" style="max-width: 100%;">
    <h3 class="text-lg font-semibold text-gray-700 mb-2">Knowledge Compilation Map</h3>
    <p class="text-gray-600 text-sm mb-4">
      Click on any node in the graph to view detailed information about that knowledge compilation language.
    </p>

  </div>
  <div class="legend">
    <h4>Legend</h4>
    <div class="legend-row"><span class="line line-primary"></span><span>Succinctness (A ≤ B)</span></div>
    <div class="legend-row"><span class="line line-danger dashed"></span><span>Incomparable (A || B)</span></div>
    <div class="legend-row"><span class="line line-success"></span><span>Equivalence (A ≡ B)</span></div>
        <div class="space-y-2 text-xs text-gray-500">
      <p><span class="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>Polynomial-time operation</p>
      <p><span class="w-2 h-2 bg-red-500 rounded-full inline-block mr-2"></span>Exponential-time operation</p>
    </div>
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