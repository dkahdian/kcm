# Data Transformation Model

This document captures the canonical approach for mutating the Knowledge Compilation Map dataset while keeping `src/lib/data/database.json` as the single source of truth.

## Canonical Dataset `D`

- **Definition**: `D` is the set of all datasets that conform to the structure of `GraphData` (languages, adjacency matrix, relation types, separating functions, etc.) and the supplemental constraints we impose (e.g., reference IDs must resolve, edges stay in sync with languages, language IDs remain unique, etc.).
- **Source**: The element `d₀ ∈ D` that ships with the app is the parsed content of `database.json`.
- **Representation**: In code, we expect a canonical type (working name `CanonicalKCData`) that is equivalent to the structure of `database.json`, i.e.,
  ```ts
  interface CanonicalKCData {
    languages: KCLanguage[];
    adjacencyMatrix: KCAdjacencyMatrix;
    relationTypes: KCRelationType[];
    separatingFunctions: KCSeparatingFunction[];
    metadata?: Record<string, unknown>;
  }
  ```
  This type must be derived mechanically from the JSON file to eliminate drift.

## Transformations `T = { t: D → D }`

Any procedure that tweaks the dataset must be framed as a pure function that:
1. Accepts a complete dataset `d ∈ D`.
2. Returns a new dataset `d' ∈ D` (or `null` if invalid) without mutating its input.

Examples include applying filters, adding a contribution, or running inference passes such as filling unknown operations.

## `transformData`

The primitive operation that coordinates these transformations has the signature:

```ts
interface TransformOptions {
  checkValidity?: boolean;
  propagateImplicit?: boolean;
}

type DataTransform = (data: CanonicalKCData) => CanonicalKCData;

function transformData(
  input: CanonicalKCData,
  lambda: DataTransform,
  options: TransformOptions = {}
): CanonicalKCData | null;
```

### Execution order

1. **Deep clone** `input` to guarantee purity (`structuredClone` should work once data is normalized).
2. **Apply** `lambda` to the clone.
3. **Validate** when `options.checkValidity === true`. Return `null` immediately on failure.
4. **Propagate implicit relationships** when `options.propagateImplicit === true` (e.g., transitive closure).

Returning `null` signals "abort the entire pipeline" and allows callers to surface errors early.

### Composition

Because every transformation works on whole datasets, arbitrary pipelines become straightforward:

```ts
const result = [
  filterByTag,
  hideUnknownEdges,
  highlightOperations,
].reduce(
  (acc, transform) => (acc ? transformData(acc, transform) : null),
  canonicalData
);
```

Each stage can opt in/out of validation and propagation via its own wrapper.

## Validity Checks

At minimum, the validity pass should enforce:
- All language IDs referenced anywhere (edges, queues, separating functions) exist.
- References, separating function IDs, and operation codes point to canonical registries.
- Adjacency matrices remain square, with synchronized `languageIds`, `indexByLanguage`, and `matrix` dimensions.
- Filters or contributions never yield duplicate language names.

The current codebase already performs fragments of these checks ad hoc (e.g., modal validation in `routes/contribute`). The new validator should centralize these guarantees and run both in the UI pipeline and server-side submission handling.

## Implicit Propagation

Certain relationships are derivable from others. Right now we manually add transitive edges when needed. With `transformData` we can:
- Perform graph closure for `"poly"` relations (e.g., if `A→B` and `B→C` are `poly`, ensure `A→C` is at least `poly`).
- Auto-fill symmetric metadata like `indexByLanguage` or derived `visual` overrides.
- Re-run helper filters such as `fill-unknown-operations` as part of propagation instead of scattering similar logic across filters.

Propagation should operate only on the cloned dataset so the original canonical data stays untouched.

## Application Scenarios

### Filters

- Today filters mutate individual `KCLanguage` objects and lists of `DirectedSuccinctnessRelation`s in isolation.
- We will rewrite every filter to operate as a `D → D` transform (no adapter layer) so filter order and composition remain explicit.
- Filters should skip validation/propagation for performance (their output is deterministic and already type-safe).

### Contribution Queue

- Each queue item `cᵢ` becomes a transformation `cᵢ: D → D`.
- After replaying the queue we cache the **entire serialized dataset** in `localStorage`—that snapshot becomes the preview source of truth instead of re-running `mergeQueueIntoBaseline`.
- Editing `cₖ` involves recomputing the prefix `c₁ … cₖ₋₁`, applying the edited `cₖ`, then replaying `cₖ₊₁ … cₙ` with identical options (`checkValidity = true`, `propagateImplicit = true`).
- The existing `src/lib/preview-merge.ts` module can be removed once the queue uses this reducer-style replay.
- Queue entries are **strictly one-to-one with the UI buttons** exposed in `ActionButtons.svelte`. Pressing **New Language, Edit Language, Relationship, Reference, or Separator** appends exactly one entry to the ordered queue. Each entry records `{ id, kind, payload }` so that replay, previews, undo/redo, and GitHub submission scripts can treat every action as an atomic transform.
- Queue order is the source of truth. Derived groupings ("Languages to Add", "References", etc.) are computed views layered on top of the ordered queue for UI convenience only.
- Queue serialization persists both the ordered entry list and the contributor metadata. Rehydration rebuilds derived views exclusively from this ordered list to avoid drift between UI and submission data.

#### Submission workflow and GitHub Action integration

1. When the contributor presses **Submit**, we send the ordered queue to the GitHub Actions workflow together with contributor info (email/GitHub/note) and submission metadata (submissionId, supersedesSubmissionId).
2. The workflow shells out to a validator (future `validateDatasetStructure`) before any git mutation. Invalid transforms abort the run with a clear error surfaced back to the UI.
3. On success the workflow replays the queue against the canonical dataset (the exact same algorithm as `applyContributionQueue`), writes the resulting dataset to `database.json` (or its canonical successor), commits the change, opens a PR, and publishes a preview bundle via rawcdn.
4. Because all downstream automation consumes the queue as a single ordered list, **a single workflow run** now encapsulates validation, dataset regeneration, PR creation, and preview publication. There is no longer a secondary script that re-reads disparate arrays.

### Data QA Pipelines

- We can run nightly transforms (e.g., `normalizeLanguageNames`, `regenDerivedReferences`) in CI before committing updates to `database.json`.
- Because the interface is uniform, we can share the same code between the browser and automated scripts.

## Implementation Notes

1. **Central module**: Add `src/lib/data/transforms.ts` exporting the foundational types, `transformData`, built-in validators, and propagation hooks.
2. **Canonical type**: Define `CanonicalKCData` next to `GraphData` (with canonical `separatingFunctions`) and load it via a single `canonicalDataset` export so we stop re-reading `database.json` piecemeal.
3. **Deep clone**: Use `structuredClone` when available; fall back to `JSON.parse(JSON.stringify(...))` for now (dataset is small) but wrap it so we can upgrade without touching consumers.
4. **Validation pass**: Replace the scattered helpers in `src/lib/utils/validation.ts` and the contribute modals with a central validator that `transformData` can run whenever contributions are replayed.
5. **Filter migration**: Rewrite each language/edge filter as a dataset transform (no adapter layer) to keep composition consistent.
6. **Preview storage**: Persist the final dataset snapshot in `localStorage` after each contribution queue replay so the viewer simply hydrates using that serialized `CanonicalKCData`.
7. **Testing**: Add unit tests for chaining and validity failures (use `npm run check` and future Vitest suites).

This model ensures every mutation pipeline stays deterministic, debuggable, and grounded in the canonical dataset.

## Implementation Status (Nov 20 2025)

| Area | Status | Notes |
| --- | --- | --- |
| Canonical dataset (`canonicalDataset`, `CanonicalKCData`) | ✅ Fully implemented | Canonical loader now exports a single dataset with languages, edges, relation types, separating functions, and metadata. |
| `transformData` core + helpers (`mapLanguagesInDataset`, `mapRelationsInDataset`) | ✅ Fully implemented | Filter pipeline and contribution transforms leverage the new dataset-level transform utilities. |
| Validity checks (`validateDatasetStructure`) | ✅ Fully implemented | Validator now enforces adjacency consistency, ID uniqueness, reference resolution, and separating-function integrity. |
| Implicit propagation (`propagateImplicitRelations`) | ⚠️ Partially implemented | Transitive poly closure plus index rebuild now run automatically; additional derived metadata steps still pending. |
| Dataset-based filters | ✅ Fully implemented | Language and edge filters now operate on whole datasets and compose via `applyFiltersWithParams`. |
| Contribution queue replay & preview snapshot | ⚠️ Partially implemented | Queue replay now runs the validator + propagation before persisting previews, but provenance workflow is still evolving. |
| GitHub submission workflow alignment | ⚠️ In progress | CI now replays ordered queues with validation; remaining work is provenance + automated review gates. |

Legend: ✅ ready, ⚠️ exists but incomplete, ⏳ not started.
