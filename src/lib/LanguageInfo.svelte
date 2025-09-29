<script lang="ts">
  import type { KCLanguage, KCOpEntry, GraphData } from './types.js';
  
  let { selectedLanguage, graphData }: { selectedLanguage: KCLanguage | null, graphData: GraphData } = $props();

  const statusColor = (op: KCOpEntry) => {
    switch (op.polytime) {
      case 'true': return '#22c55e';
      case 'false': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  function dash(rt: any) {
    const style = rt?.style?.lineStyle ?? 'solid';
    return style === 'dashed' ? '6,4' : style === 'dotted' ? '2,4' : '0';
  }
</script>

<div class="content-wrapper">
  <div class="scrollable-content">
    {#if selectedLanguage}
      <div class="language-details">
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
      <div class="welcome-message">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Knowledge Compilation Map</h3>
        <p class="text-gray-600 text-sm mb-4">
          Click on any node in the graph to view detailed information about that knowledge compilation language.
        </p>
      </div>
    {/if}
    
    <div class="legend">
      <h4>Legend</h4>
      
      <!-- Relations Legend -->
      <div class="legend-section">
        <h5>Relations</h5>
        {#each graphData.relationTypes as rt}
          <div class="legend-row">
            <svg width="56" height="14" viewBox="0 0 56 14" aria-hidden="true">
              <defs>
                <marker id={`arrow-end-${rt.id}`} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={rt.style?.lineColor ?? '#6b7280'} />
                </marker>
                <marker id={`arrow-start-${rt.id}`} markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M6,0 L0,3 L6,6 Z" fill={rt.style?.lineColor ?? '#6b7280'} />
                </marker>
              </defs>
              <line x1="8" y1="7" x2="48" y2="7"
                stroke={rt.style?.lineColor ?? '#6b7280'}
                stroke-width={(rt.style?.width ?? 2) as any}
                stroke-dasharray={dash(rt)}
                marker-end={`url(#arrow-end-${rt.id})`}
                marker-start={rt.id === 'equivalence' ? `url(#arrow-start-${rt.id})` : undefined}
              />
            </svg>
            <span class="legend-label">{rt.name}{rt.label ? ` (${rt.label})` : ''}</span>
          </div>
        {/each}
      </div>
      
      <!-- Polytime Status Legend -->
      <div class="legend-section">
        <h5>Operation Complexity</h5>
        <div class="legend-row">
          <span class="dot" style="background: #22c55e"></span>
          <span>Polynomial-time operation</span>
        </div>
        <div class="legend-row">
          <span class="dot" style="background: #ef4444"></span>
          <span>Exponential-time operation</span>
        </div>
        <div class="legend-row">
          <span class="dot" style="background: #f59e0b"></span>
          <span>Unknown complexity</span>
        </div>
      </div>
    </div>
  </div>
</div>
  
  <style>
    .content-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    
    .scrollable-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding-bottom: 1rem;
    }
    
    .language-details, .welcome-message {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    
    .legend {
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      background: #ffffff;
      margin-top: 1rem;
    }
    .legend h4 {
      margin: 0 0 0.75rem 0;
      font-weight: 600;
      color: #111827;
      font-size: 0.875rem;
    }
    .legend-section {
      margin-bottom: 0.75rem;
    }
    .legend-section:last-child {
      margin-bottom: 0;
    }
    .legend-section h5 {
      margin: 0 0 0.5rem 0;
      font-weight: 500;
      font-size: 0.8rem;
      color: #374151;
    }
    .legend-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #374151;
      margin-bottom: 0.25rem;
    }
    .legend-row:last-child {
      margin-bottom: 0;
    }
    .legend-label {
      white-space: nowrap;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  </style>