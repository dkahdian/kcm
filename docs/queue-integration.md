# Queue System Integration Guide

This guide explains how to integrate the new queue system into the existing contribution UI.

## Current State

The existing `src/routes/contribute/+page.svelte` manages contributions with:
- Local state arrays: `languagesToAdd`, `languagesToEdit`, `relationships`, `newReferences`
- Direct mutation on add/edit/delete
- Manual validation in `buildSubmissionPayload`
- No persistent state (lost on refresh)

## Integration Strategy

**Incremental refactor**: Keep UI intact, add queue as backend layer.

### Phase 1: Initialize Queue Engine (✅ COMPLETE)

Core queue system is implemented and tested:
- ✅ GraphData model
- ✅ Validation rules
- ✅ Queue operations (references, languages, relationships)
- ✅ QueueEngine with add/edit/remove
- ✅ Svelte store with reactivity
- ✅ localStorage persistence
- ✅ Examples and documentation

### Phase 2: Add Queue Store to Contribute Page

**File**: `src/routes/contribute/+page.svelte`

1. Import the queue store at the top:

```svelte
<script lang="ts">
  import { queueStore, queueItems, queueLength } from '$lib/queue';
  import { onMount } from 'svelte';
  
  // ... existing imports
  
  // Load queue on mount
  onMount(() => {
    queueStore.loadFromStorage();
  });
</script>
```

2. Subscribe to queue state (derived):

```svelte
<script lang="ts">
  // Reactive subscriptions
  $: currentQueue = $queueItems;
  $: currentLength = $queueLength;
</script>
```

### Phase 3: Convert Modal Handlers to Queue Operations

Instead of directly mutating arrays, create queue items:

#### Add Reference

**Before:**
```typescript
function handleAddReference(bibtex: string) {
  newReferences = [...newReferences, bibtex];
}
```

**After:**
```typescript
import { createAddReference } from '$lib/queue';

function handleAddReference(bibtex: string) {
  const item = createAddReference(bibtex);
  const result = queueStore.add(item);
  
  if (!result.success) {
    submitError = result.error;
    return;
  }
  
  // Success - queue is automatically updated via store
  showAddReferenceModal = false;
}
```

#### Add Language

**Before:**
```typescript
function handleAddLanguage(language: LanguageToAdd) {
  languagesToAdd = [...languagesToAdd, language];
}
```

**After:**
```typescript
import { createAddLanguage, languageToAddToPayload } from '$lib/queue';

function handleAddLanguage(language: LanguageToAdd) {
  const payload = languageToAddToPayload(language);
  const item = createAddLanguage(payload);
  const result = queueStore.add(item);
  
  if (!result.success) {
    submitError = result.error;
    return;
  }
  
  showAddLanguageModal = false;
}
```

#### Manage Relationship

**Before:**
```typescript
function handleSaveRelationship(relationship: RelationshipEntry) {
  relationships = [...relationships, relationship];
}
```

**After:**
```typescript
import { createManageRelationship, relationshipEntryToRelation } from '$lib/queue';

function handleSaveRelationship(relationship: RelationshipEntry) {
  const relation = relationshipEntryToRelation(relationship);
  const item = createManageRelationship(
    relationship.sourceId,
    relationship.targetId,
    relation
  );
  const result = queueStore.add(item);
  
  if (!result.success) {
    submitError = result.error;
    return;
  }
  
  showManageRelationshipModal = false;
}
```

### Phase 4: Update Queue Display

Replace the `ContributionQueue` component props with queue data:

**Before:**
```svelte
<ContributionQueue
  {languagesToAdd}
  {languagesToEdit}
  {newReferences}
  {relationships}
  ...
/>
```

**After:**
```svelte
<ContributionQueue
  queueItems={$queueItems}
  onEdit={(index, item) => {
    // Open appropriate modal based on item.type
    if (item.type === 'AddReference') {
      editReferenceIndex = index;
      showAddReferenceModal = true;
    }
    // ... handle other types
  }}
  onRemove={(index) => {
    const result = queueStore.remove(index);
    if (!result.success) {
      submitError = result.error;
    }
  }}
/>
```

### Phase 5: Update Submission

**Before:**
```typescript
const submission = buildSubmissionPayload(
  contributorEmail,
  contributorGithub,
  contributorNote,
  languagesToAdd,
  languagesToEdit,
  changedRelationships,
  newReferences,
  data.existingLanguageIds
);
```

**After:**
```typescript
import { graphDataToFiles } from '$lib/queue';

const engine = queueStore.getEngine();
const current = engine.getCurrent();
const files = graphDataToFiles(current);

const submission = {
  contributorEmail,
  contributorGithub: contributorGithub || undefined,
  contributorNote: contributorNote || undefined,
  files, // Serialized JSON files ready for PR
  queueSummary: $queueItems.map(item => item.description)
};
```

### Phase 6: Clear Queue on Success

**After successful submission:**
```typescript
// Success - redirect to success page
queueStore.clear(); // Clears localStorage too
goto('/contribute/success');
```

## Benefits

1. **Validation on Add**: No invalid items in queue
2. **Persistent State**: Survives page refresh
3. **Atomic Operations**: All-or-nothing
4. **Clear Error Messages**: Validation failures are descriptive
5. **Invariant Guarantees**: Matrix alignment, referential integrity
6. **Preview**: `engine.getCurrent()` shows exact final state
7. **Undo**: Remove items by index
8. **Rebuild on Edit**: Automatically revalidates tail

## Migration Checklist

- [ ] Import queue store in `+page.svelte`
- [ ] Load from localStorage on mount
- [ ] Convert `handleAddReference` to use queue
- [ ] Convert `handleAddLanguage` to use queue
- [ ] Convert `handleEditLanguage` to use queue
- [ ] Convert `handleSaveRelationship` to use queue
- [ ] Update delete handlers to use `queueStore.remove(index)`
- [ ] Update edit handlers to use `queueStore.edit(index, newItem)`
- [ ] Update `ContributionQueue` component to use queue data
- [ ] Update submission to use `graphDataToFiles`
- [ ] Clear queue on successful submission
- [ ] Add error display for queue validation failures
- [ ] Test full workflow: add → edit → remove → submit

## Testing Plan

1. **Add Operations**
   - Add reference with valid BibTeX → success
   - Add reference with duplicate DOI → fail
   - Add language with valid data → success
   - Add language with existing ID → fail
   - Add relationship between existing languages → success
   - Add relationship with non-existent language → fail

2. **Edit Operations**
   - Edit reference → tail revalidates
   - Edit language → references still valid
   - Edit relationship → endpoints still exist

3. **Remove Operations**
   - Remove session-created reference → success
   - Remove baseline reference → fail
   - Remove session-created language → success
   - Remove baseline language → fail

4. **Persistence**
   - Add items → refresh page → items restored
   - Submit successfully → refresh page → queue empty

5. **Submission**
   - Queue with valid items → generates correct JSON files
   - Files have sorted keys (deterministic)
   - Transformation codes converted correctly

## Rollback Plan

If issues arise, the queue system is completely isolated in `src/lib/queue/`. Simply revert changes to `+page.svelte` and the original flow works as before.

## Future Enhancements

- [ ] Visual queue timeline/history
- [ ] Undo/redo operations
- [ ] Batch operations (add multiple references at once)
- [ ] Queue item reordering (drag & drop)
- [ ] Export queue as JSON
- [ ] Import queue from JSON
- [ ] Diff view (baseline vs current)
- [ ] Conflict resolution UI
