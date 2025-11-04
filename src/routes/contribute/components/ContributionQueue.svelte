<script lang="ts">
  import type { LanguageToAdd, RelationshipEntry } from '../types.js';
  import { relationKey } from '../logic.js';
  import LanguageQueueItem from './LanguageQueueItem.svelte';
  import ReferenceQueueItem from './ReferenceQueueItem.svelte';
  import RelationshipQueueItem from './RelationshipQueueItem.svelte';

  /**
   * Display all queued contribution items
   */
  let {
    languagesToAdd,
    languagesToEdit,
    newReferences,
    relationships,
    modifiedRelations,
    expandedLanguageToAddIndex,
    expandedLanguageToEditIndex,
    expandedReferenceIndex,
    expandedRelationshipIndex,
    onToggleExpandLanguageToAdd,
    onToggleExpandLanguageToEdit,
    onToggleExpandReference,
    onToggleExpandRelationship,
    onEditLanguageToAdd,
    onEditLanguageToEdit,
    onDeleteLanguageToAdd,
    onDeleteLanguageToEdit,
    onEditReference,
    onDeleteReference,
    onEditRelationship,
    onDeleteRelationship
  }: {
    languagesToAdd: LanguageToAdd[];
    languagesToEdit: LanguageToAdd[];
    newReferences: string[];
    relationships: RelationshipEntry[];
    modifiedRelations: Set<string>;
    expandedLanguageToAddIndex: number | null;
    expandedLanguageToEditIndex: number | null;
    expandedReferenceIndex: number | null;
    expandedRelationshipIndex: number | null;
    onToggleExpandLanguageToAdd: (index: number) => void;
    onToggleExpandLanguageToEdit: (index: number) => void;
    onToggleExpandReference: (index: number) => void;
    onToggleExpandRelationship: (index: number) => void;
    onEditLanguageToAdd: (index: number) => void;
    onEditLanguageToEdit: (index: number) => void;
    onDeleteLanguageToAdd: (index: number) => void;
    onDeleteLanguageToEdit: (index: number) => void;
    onEditReference: (index: number) => void;
    onDeleteReference: (index: number) => void;
    onEditRelationship: (index: number) => void;
    onDeleteRelationship: (index: number, key: string) => void;
  } = $props();

  const hasAnyItems = $derived(
    languagesToAdd.length > 0 ||
    languagesToEdit.length > 0 ||
    newReferences.length > 0 ||
    relationships.filter((rel) => modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))).length > 0
  );
</script>

<div class="space-y-3">
  <h2 class="text-lg font-bold text-gray-900">Queued Changes</h2>
  <p class="text-sm text-gray-600">Items you've added will appear here.</p>
  
  <div class="space-y-2">
    <!-- Languages to Add -->
    {#each languagesToAdd as lang, index}
      <LanguageQueueItem
        language={lang}
        {index}
        isExpanded={expandedLanguageToAddIndex === index}
        isEdit={false}
        onToggleExpand={onToggleExpandLanguageToAdd}
        onEdit={onEditLanguageToAdd}
        onDelete={onDeleteLanguageToAdd}
      />
    {/each}

    <!-- Languages to Edit -->
    {#each languagesToEdit as lang, index}
      <LanguageQueueItem
        language={lang}
        {index}
        isExpanded={expandedLanguageToEditIndex === index}
        isEdit={true}
        onToggleExpand={onToggleExpandLanguageToEdit}
        onEdit={onEditLanguageToEdit}
        onDelete={onDeleteLanguageToEdit}
      />
    {/each}

    <!-- References -->
    {#each newReferences as ref, index}
      <ReferenceQueueItem
        reference={ref}
        {index}
        isExpanded={expandedReferenceIndex === index}
        onToggleExpand={onToggleExpandReference}
        onEdit={onEditReference}
        onDelete={onDeleteReference}
      />
    {/each}

    <!-- Relationships -->
    {#each relationships as rel, index}
      {@const isModified = modifiedRelations.has(relationKey(rel.sourceId, rel.targetId))}
      <RelationshipQueueItem
        relationship={rel}
        {index}
        {isModified}
        isExpanded={expandedRelationshipIndex === index}
        onToggleExpand={onToggleExpandRelationship}
        onEdit={onEditRelationship}
        onDelete={onDeleteRelationship}
      />
    {/each}

    {#if !hasAnyItems}
      <div class="text-center py-8 text-gray-500 italic">
        No changes queued yet. Use the buttons below to add items.
      </div>
    {/if}
  </div>
</div>
