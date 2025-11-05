# Contribution Pipeline Specification

This document formalizes the contribution pipeline as a sequence of pure, atomic transformations over a unified in-memory GraphData model, with deterministic validation and diff-to-files mapping for PRs.

## Purpose

- Provide an unambiguous contract for queue items (contributions)
- Define validation rules and revalidation strategies for add, edit, and delete operations
- Specify preview semantics and PR generation via file patching

## Core Concepts

### Unified GraphData model (in-memory)

GraphData represents the entire KC map dataset combined from multiple JSON files. It’s used only in memory for validation, preview, and diffing back to the repo’s file layout.

Minimal shape (union of existing sources):

```ts
export type LanguageId = string; // kebab-case, unique, same IDs as filenames in src/lib/data/json/languages/*.json

export interface LanguageData { /* from json/languages/*.json; no references here */
  id: LanguageId;
  name: string;
  // ...properties in src/lib/types.ts KCLanguage minus references
}

export interface ReferenceData { /* from references.json */
  id: string; // unique
  // ...other fields
}

export interface RelationMatrix {
  languageIds: LanguageId[]; // ordered list; indexes align with matrix rows/cols
  matrix: (DirectedSuccinctnessRelation | null)[][]; // from edges.json
}

export interface OperationsCatalog { /* operations.json */ }
export interface PolytimeComplexities { /* polytime-complexities.json */ }
export interface RelationTypes { /* relation-types.json */ }
export interface TagsData { /* tags.json */ }

// Separating functions: implemented per existing data/types in the repo.
// The GraphData should include this collection if present in data, using the
// exact types defined in src/lib/types.ts (source of truth).
export interface SeparatingFunctions { /* see src/lib/types.ts */ }

export interface GraphData {
  languages: Record<LanguageId, LanguageData>; // normalized for O(1) lookups
  references: Record<string, ReferenceData>;
  relationMatrix: RelationMatrix;
  operations: OperationsCatalog;
  complexities: PolytimeComplexities;
  relationTypes: RelationTypes;
  tags: TagsData;
  separatingFunctions?: SeparatingFunctions; // if implemented in data
}
```

Notes
- languages directory remains the source of truth per-language. GraphData normalizes these for validation/apply.
- relationMatrix.languageIds order is authoritative for matrix alignment.

### Queue Item Contract

Each queue item is a pure function over GraphData:

```ts
export type QueueFn = (input: GraphData) => GraphData; // no side effects
```

Atomicity and failure policy
- Atomic: a queue item either applies fully or is rejected by validation; no partial apply.
- On validation failure during any operation (append, edit, delete-revalidate), the offending contribution and all subsequently attempted contributions in that action are removed from the queue state and not applied.

Idempotence policy
- Duplicates MUST fail validation (no silent no-ops). This applies, e.g., to duplicate references, duplicate languages, and duplicate tags.

Queue item structure (recommended):

```ts
export interface QueueItem {
  id: string; // stable UUID
  type: 'AddLanguage' | 'AddReference' | 'AddTag' | 'ManageRelationship' | 'EditLanguage' | 'EditReference' | 'RemoveLanguage' | 'RemoveReference' | 'RemoveTag' | 'RemoveRelationship';
  payload: unknown; // discriminated by type
  apply: QueueFn; // applies to GraphData
  validate: (input: GraphData) => ValidationResult; // validates against current input
}

// Validator is a pure function: (data, item) -> OK | Error(message)
export type ValidationResult = { ok: true } | { ok: false; error: string };
```

## Validation Rules (non-exhaustive)

Common invariants (apply to all types):
- Referential integrity
  - Relationship endpoints must reference existing languageIds
  - References attached to languages/edges must exist in `references`
- Uniqueness
  - Language IDs and names (case-insensitive) must be unique
  - Reference IDs unique; tag IDs unique
- Matrix alignment
  - `relationMatrix.matrix` must be square and match `relationMatrix.languageIds.length`
  - No out-of-bound indexes when adding/removing languages
- Allowed relation values
  - Only values from `RelationTypes` are permitted; null means “no known relation”

Operation-specific highlights (v1 canonical set):
- AddLanguage
  - Must supply unique `id` matching filename convention (lowercase-hyphen)
  - Initialize matrix: add row+column with null relations; append `id` to `languageIds`
- RemoveLanguage
  - Not generally supported. Only applicable to languages created within the current queue session (i.e., not present in baseline). Deleting such a language will cause downstream items that reference it to fail validation (e.g., relationships), and those downstream items will be removed.
- EditLanguage
  - May change metadata but not `id`; if `id` must change, model as Remove+Add
- ManageRelationship
  - Endpoints must exist; value must be allowed; if setting to null, it’s a removal
  - Directed relations may be set simultaneously with different relation types in both directions; no mutual exclusivity is enforced
- AddReference
  - Enforce uniqueness by canonical identity: prefer DOI when present (exact DOI match → duplicate). Otherwise use a normalized pair (URL, title) as a backup; equality on this pair → duplicate.
  - URL normalization recommendation: lowercase scheme+host, remove fragment, trim trailing slash; title normalization: collapse internal whitespace and trim
  - Duplicate references MUST fail validation
- RemoveReference
  - Only allowed for references created within the current queue session; attempts to remove a baseline reference should fail
  - If later items in the queue link to a removed reference, validation will fail at the first such item and the rebuild process will drop it and all remaining items in that action
- AddTag
  - Tag IDs must be unique; duplicates fail
- AddRelationship (alias of ManageRelationship add)
- AddSeparatingFunction (planned)
  - Use the schema and invariants as defined in src/lib/types.ts and existing data files

All validations return `ValidationResult`; a queue item cannot be applied unless `valid === true`.

## Natural Queue Ordering

To maintain dependency invariants and improve UX, operations must follow this natural order:

1. **AddReference** - References never depend on other items
2. **AddLanguage** - New languages may reference existing or newly-added references
3. **EditLanguage** - Edits may reference new languages or references
4. **ManageRelationship** - Relationships depend on languages existing

This ordering ensures that:
- Deleting a reference invalidates dependent languages/relationships (fail forward)
- Deleting a language invalidates dependent relationships (fail forward)
- Deleting a relationship never invalidates anything (no dependents)

### Ordering Validation Rules

On **add**:
- AddReference can be added at any position among other AddReference items
- AddLanguage must come after all AddReference items it references
- EditLanguage must come after AddLanguage for that language (if adding new) and after all references it uses
- ManageRelationship must come after all languages it references

The validator enforces these constraints by checking the queue position during validation.

### Edit Restrictions

- **At most one EditLanguage per language ID** - Cannot edit the same language multiple times in the queue
- **EditLanguage is mutually exclusive with prior AddLanguage** - Can only edit languages that exist at that queue position (and were not added earlier).
- Editing item k uses state G_k (before the edit), not G_n (current state), to prevent circular dependencies

## Queue Processing Semantics

Let Q = [q1, q2, ..., qn] be the current queue; let G0 be the original baseline GraphData (repo state). Define Gi = qi(Gi-1).

### Append (add q_{n+1})
1. Compute Gn by sequential application if not memoized, else use cached Gn
2. **Validate ordering**: Check q_{n+1} type can be added after Q's current items
3. Validate q_{n+1} against Gn
4. If valid, set Gn+1 = q_{n+1}(Gn) and append to Q; else reject with error and do not append

### Delete item k (remove qk) — simplified rebuild
1. Set current = G0 (original baseline)
2. Iterate through the queue except qk from the beginning, validating and applying each item onto current
3. On the first invalid item during this rebuild pass, stop and remove the offending item and all remaining items from the queue (tail drop)
4. The queue is now the validated prefix that succeeded during the rebuild

### Edit item k (replace qk with qk*) — simplified rebuild
1. Replace qk with qk* in the queue
2. Set current = G0 (original baseline)
3. Iterate through the entire queue from the start, validating and applying each item onto current
4. On the first invalid item during this rebuild pass, stop and remove the offending item and all remaining items from the queue (tail drop)
5. The queue is now the validated prefix that succeeded during the rebuild

Complexity
- Revalidation is O(length of affected suffix)
- We may cache prefix results to avoid recomputation when multiple edits occur

## Preview Semantics

Preview is simply the current GraphData obtained from applying the queue to the original baseline according to the rules above.
- Two-state model: store Original (G0) and Current (Gcurrent)
  - On append: validate against Gcurrent and, if valid, apply to form the new Gcurrent (do not reset to G0)
  - On edit/delete: set Current = Original, then iterate and re-validate/apply the entire queue from the beginning; stop at first invalid and drop the tail
- No separate caching layer is required for preview; it is identical to the current graph data generated by the queue

## Diff → File Patching → PR

Workflow to materialize the queue into a PR:
1. Build Gfinal by applying all queue items to G0
2. Project Gfinal back to the repository’s file layout:
   - languages/*: denormalize each `LanguageData` back to JSON files
   - edges.json: serialize `relationMatrix`
   - references.json, tags.json, operations.json, relation-types.json, polytime-complexities.json similarly
3. Generate textual diffs for changed files only
4. Create a branch and commit changes; open PR with summary

Notes
- Sorting and stable serialization: ensure deterministic JSON formatting (sorted keys, canonical whitespace) so diffs are meaningful
- File naming for languages is the `id` with `.json`

## Error Handling and UX

- Validator shape is `(data, item) -> { ok: true } | { ok: false, error: string }`.
- On failure: the contribution that caused the error (and any remaining contributions attempted in that action) are removed; the UI presents the error string to the user.
- Validation error messages are human-friendly; UI shows inline details with links to offending entities.
- Queue item tooltips show: preconditions, side-effects, and affected files

## Developer API Sketch

```ts
export interface QueueEngine {
  baseline: GraphData; // G0
  queue: QueueItem[];
  // Derived / cached:
  prefixStates?: GraphData[]; // optional memoization: G0..Gn

  add(item: QueueItem): ValidationResult; // validates against Gn; mutates queue only if valid
  remove(k: number): { valid: boolean; firstInvalidIndex?: number; errors?: string[] };
  edit(k: number, item: QueueItem): { valid: boolean; firstInvalidIndex?: number; errors?: string[] };
  preview(p: number): GraphData; // returns Gp

  // Serialization boundaries
  toFiles(g: GraphData): RepoFiles; // back to discrete JSON files
  fromFiles(files: RepoFiles): GraphData; // build baseline
}
```

## Reference Invariants (examples)

- Language ID format: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `relationMatrix.matrix.length === relationMatrix.languageIds.length`
- For any i, j: matrix[i][i] is null (no self succinctness)
- Directed succinctness: when `matrix[i][j]` is set, ensure `matrix[j][i]` adheres to intended asymmetry rules (typically null or a distinct relation if allowed)

## Implementation Clarifications

### Reference Deduplication
- Extract DOI from BibTeX `DOI` field (case-insensitive)
- Extract URL from BibTeX `url` field
- Extract title from BibTeX `title` field
- Canonical identity: prefer DOI, fallback to normalized (URL, title) pair
- URL normalization: lowercase scheme+host, remove fragment, trim trailing slash
- Title normalization: collapse internal whitespace, trim, lowercase
- Full BibTeX parser not required; regex extraction is sufficient

### GraphData Construction
- Load from existing TypeScript modules in `src/lib/data/`
- `buildBaselineGraphData()` reflects JSON files in `src/lib/data/json/`
- Modules: languages.ts, edges.ts, references.ts, operations.ts, etc.

### File Serialization
- Use `JSON.stringify` with sorted keys for deterministic output
- 2-space indent is optional but preferred
- Handle transformation operation code conversion (safe keys ↔ display codes)
- Safe keys (e.g., `AND_C`) used in JSON storage
- Display codes (e.g., `∧C`) used in UI

### Queue Persistence
- Save to localStorage with key `kcm_contribution_queue`
- Clear on successful submission
- Restore on page load with deserializer
- Handle deserialization failures gracefully (use valid prefix)

### Tags and Separating Functions
- Custom tag creation UI: lower priority (deferred)
- Tags currently managed as part of language properties
- Separating functions: deferred to future work
- UI already supports separating functions in relationship modal

### Integration with Existing UI
- Incremental refactor approach: keep existing UI intact
- Existing modals (AddLanguage, AddReference, ManageRelationship) remain
- QueueEngine operates as backend layer under existing forms
- No need to rebuild entire contribution page from scratch
- Wire existing handlers to queue operations gradually

## Testing Strategy

- Unit tests: validate each operation type with happy path + 2 edge cases (duplicate, missing reference, missing language)
- Property tests: matrix size invariants and referential integrity hold after random sequences of valid operations
- Snapshot tests: preview views for specific queue prefixes are stable

## Operational Notes

- Performance: revalidation cost is proportional to the number of items after the edited index; cache prefixes to keep edits snappy
- Concurrency: queue is per-user session; PR generation revalidates against latest main before pushing

## Example Flow (Append)

- Start with Gn
- User proposes AddReference r* → validate against Gn; if valid, apply to get Gn+1
- UI indicates added files: likely `references.json` only, unless linked to a language file

## CLI and Logging Conventions

Use simple logging during validation/apply to keep users informed during development; examples:

```powershell
# Show current queue size and action
$index = 7; echo "[contrib] Validating item $index (AddReference) against Gn..."

# Report validation outcome
$errors = 0; echo "[contrib] Validation: PASS; warnings=0; errors=$errors"

# On delete/edit revalidation
$k=3; echo "[contrib] Rebuilding prefix G$($k-1) and revalidating tail..."
```