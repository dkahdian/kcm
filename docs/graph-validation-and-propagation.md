# Graph Validation and Propagation — Implementation Specification

This document describes the validation and propagation algorithms used by the Updated Knowledge Compilation Map. It mirrors the structure of the executive summary but provides implementation-level detail: TypeScript types, function signatures, file locations, and description-generation templates.

**Canonical source files:**

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript types (single source of truth) |
| `src/lib/data/propagation/index.ts` | Orchestrator: global fixed-point loop over Phases 0–6 |
| `src/lib/data/propagation/helpers.ts` | Reachability, path reconstruction, citation formatting |
| `src/lib/data/propagation/edge-propagation.ts` | Phases 1–2: succinctness upgrades and downgrades |
| `src/lib/data/propagation/query-propagation.ts` | Phases 3–6: query/transformation propagation |
| `src/lib/data/validation/semantic.ts` | Validation: adjacency consistency checks |
| `src/lib/data/query-lemmas.ts` | Operation implication lemmas (loaded from `database.json`) |

---

## 1. Data Representation

### 1.1 Languages and Matrices

The knowledge base stores a set of KC languages **L** and two relation matrices:

- **Succinctness matrix** `M_s: L × L → S`, where `M_s(L₁, L₂)` records the complexity of compiling from `L₁` to `L₂`.
- **Operations matrix** `M_o: L × O → S̃`, where `O = Q ∪ T` (queries ∪ transformations) and `M_o(L, o)` records the tractability of operation `o` on language `L`.

#### TypeScript types

The succinctness matrix is represented as `KCAdjacencyMatrix` (`src/lib/types.ts`):

```typescript
interface KCAdjacencyMatrix {
  languageIds: string[];                          // language IDs (unique internal identifiers)
  indexByLanguage: Record<string, number>;         // maps language ID → matrix index
  matrix: (DirectedSuccinctnessRelation | null)[][]; // M_s[i][j]
}
```

Each cell is a `DirectedSuccinctnessRelation | null`:

```typescript
interface DirectedSuccinctnessRelation {
  status: string;                          // one of the six status codes below
  description?: string;                    // human-readable justification
  caveat?: string;                         // optional "unless" clause (e.g., "P=NP")
  refs: string[];                          // reference IDs (BibTeX keys)
  separatingFunctionIds?: string[];        // separating function shortNames
  hidden?: boolean;                        // hidden by transitive reduction
  derived?: boolean;                       // true if inferred by the propagator
  noPolyDescription?: DescriptionComponent; // structured proof for the "no poly" claim
  quasiDescription?: DescriptionComponent;  // structured proof for the "quasi exists" claim
}
```

`DescriptionComponent` provides structured proof tracking for composite statuses:

```typescript
interface DescriptionComponent {
  description: string;   // description/justification for this claim
  refs: string[];        // supporting references
  derived: boolean;      // true if this part was inferred
}
```

Operation support per language is stored as `KCOpSupport`:

```typescript
interface KCOpSupport {
  complexity: string;     // complexity code (same vocabulary as status)
  caveat?: string;        // optional "unless" clause
  refs: string[];         // reference IDs
  description?: string;   // justification
  derived?: boolean;      // true if inferred by propagator
}
```

### 1.2 Status Vocabulary

Each succinctness relationship carries one of six statuses capturing the existence (✓), non-existence (✗), or unknown status (?) of polynomial (P) and quasi-polynomial (Q) compilations:

| Status code              | P exists? | Q exists? | Description |
|--------------------------|-----------|-----------|-------------|
| `poly`                   | ✓         | ✓         | Polynomial compilation exists |
| `unknown-poly-quasi`     | ?         | ✓         | Quasi-polynomial compilation exists; polynomial unknown |
| `no-poly-quasi`          | ✗         | ✓         | No polynomial compilation; quasi-polynomial exists |
| `unknown-both`           | ?         | ?         | Both unknown |
| `no-poly-unknown-quasi`  | ✗         | ?         | No polynomial compilation; quasi-polynomial unknown |
| `no-quasi`               | ✗         | ✗         | No quasi-polynomial compilation (and thus no polynomial) |

For algorithmic clarity, we define the reduced status set `S̃ = {poly, no-poly, unknown}`. All algorithms below are described in terms of `S̃` and straightforwardly extended to the full set `S`.

**Implementation.** Two constant sets in `helpers.ts` define which statuses qualify as reachable:

```typescript
const POLY_STATUS  = new Set(['poly']);
const QUASI_STATUS = new Set(['poly', 'unknown-poly-quasi', 'no-poly-quasi']);
```

`POLY_STATUS` selects edges where a polynomial compilation exists. `QUASI_STATUS` selects edges where a quasi-polynomial compilation exists (regardless of the polynomial status).

### 1.3 Operations

We say a language `L` **supports** an operation `o` if `M_o(L, o) = poly`, and that `o` **is unsupported by** `L` if `M_o(L, o) = no-poly`. Note that "not supported" (which could be `no-poly` or `unknown`) is distinct from "unsupported" (which means strictly `no-poly`).

Operations are divided into **queries** (CO, VA, CE, IM, EQ, SE, CT, ME) and **transformations** (CD, FO, SFO, ∧C, ∧BC, ∨C, ∨BC, ¬C).

### 1.4 Caveats

Many `no-poly` results are conditional on complexity-theoretic assumptions such as P ≠ NP or the polynomial hierarchy not collapsing. Each entry in `M_s` or `M_o` may carry an optional **caveat** string (e.g., `"P=NP"`), meaning the result holds *unless* the caveat is true.

When a derived result depends on multiple edges with different caveats, those are merged by set union joined with " OR ". The function `collectCaveatsUnion()` in `helpers.ts` walks a path and collects unique caveats:

```typescript
function collectCaveatsUnion(path: number[], matrix: KCAdjacencyMatrix): string | undefined
```

**Known limitation.** The propagator does not prioritize unconditional results over conditional ones. This means a conditional result may survive where an unconditional proof exists. Fixing this would require doubling the status space.

### 1.5 Transitivity Lemmas

The propagation logic relies on the following lemmas. We assume `L₁, L₂ ∈ L`, `q ∈ Q`, `t ∈ T`.

**Succinctness transitivity.**
- If `L₁ ≤_p L₂` and `L₂ ≤_p L₃`, then `L₁ ≤_p L₃`.
- Corollary: if `L₁ ≰_p L₃`, then either `L₁ ≰_p L₂` or `L₂ ≰_p L₃`.

**Query-by-compiling.**
- If `L₁ ≤_p L₂` and `L₂` supports `q`, then `L₁` supports `q` (compile, then query).
- Corollary (Phase 5a): if `L₁` is unsupported for `q`, but `L₁ ≤_p L₂`, then `L₂` is unsupported for `q` as well.
- Corollary (Phase 6): if `L₁` supports `q` but `L₂` is unsupported for `q`, then `L₂ ≰_p L₁`.

**Warning:** A similar result does *not* hold for transformations.

**Operation implication lemmas.**
A family of lemmas `F_l ⊂ P(O) × O` of the form `o₁ ∧ … ∧ oₙ ⇒ o_{n+1}`: if a language supports all antecedent operations, it also supports the consequent. For example, `CO ∧ ¬C ⇒ VA`. Their contrapositives are also exploited: `¬VA ∧ ¬C ⇒ ¬CO`.

**Implementation.** Lemmas are stored in `database.json` under the `operationLemmas` key and loaded as `OPERATION_LEMMAS: OperationLemma[]` in `src/lib/data/query-lemmas.ts`:

```typescript
interface OperationLemma {
  id: string;                // unique identifier
  antecedent: string[];      // operation codes that must be supported
  consequent: string;        // operation code that is implied
  description: string;       // human-readable justification
  refs: string[];            // supporting references
}
```

---

## 2. Reachability (DFS-from-Each-Source)

Several phases require testing whether language `L_i` can reach `L_j` via a chain of edges with statuses in a given set (e.g., `POLY_STATUS` or `QUASI_STATUS`). This is computed by `computeReachability()` in `helpers.ts`:

```typescript
function computeReachability(
  matrix: KCAdjacencyMatrix,
  allowed: Set<string>
): { reach: boolean[][]; parent: number[][] }
```

**Algorithm.** For each source vertex, run a DFS following only edges whose status is in `allowed`. The `reach[i][j]` boolean records whether `j` is reachable from `i`; the `parent[i][j]` integer records the predecessor on the first discovered path, enabling path reconstruction.

**Cost:** O(|L|²) per call (one DFS per source, each scanning all neighbors).

Path reconstruction is handled by `reconstructPathIndices()`:

```typescript
function reconstructPathIndices(source: number, target: number, parentRow: number[]): number[]
```

This walks back from `target` to `source` via `parent` pointers, returning the index path in order [source, …, target].

---

## 3. Validation

**Motivation.** The validator checks whether the knowledge base is consistent with the transitivity lemmas. It is used (1) as a precondition before propagation (Phase 0), (2) as a subroutine within Phase 2 (trial-and-contradiction downgrades), and (3) to validate user contributions.

**Implementation.** `validateAdjacencyConsistency()` in `src/lib/data/validation/semantic.ts`:

```typescript
function validateAdjacencyConsistency(data: GraphData): SemanticValidationResult

interface SemanticValidationResult {
  ok: boolean;
  error?: string;          // formatted contradiction description
  witnessPath?: string[];  // the path that demonstrates the contradiction
}
```

**Succinctness validation.** Compute reachability for `POLY_STATUS` and `QUASI_STATUS`. For each pair `(i, j)`:
- If there is a poly-reachable path `i → … → j` but `M_s(i, j)` ∈ {`no-poly-unknown-quasi`, `no-poly-quasi`, `no-quasi`}, report a contradiction with the witness path.
- If there is a quasi-reachable path but `M_s(i, j) = no-quasi`, report a contradiction.

Cost: O(|L|²) for the DFS + O(|L|²) for the scan = O(|L|²).

**Query-by-compile validation.** Implemented separately as `validateQueryConsistency()` in `query-propagation.ts`. For each pair `(L_i, L_j)` where `L_i ≤_p L_j` (poly-reachable), check that no query supported by `L_j` is unsupported by `L_i`. Cost: O(|L|² · |Q|).

---

## 4. Propagation — Overview

The propagator is a mapping `(M_s, M_o) → (M̃_s, M̃_o)` that replaces `unknown` entries with `poly` or `no-poly` wherever the transitivity lemmas and operation lemmas force a conclusion. All derived entries are tagged `derived: true` and carry human-readable description strings with inline `\citet{}` citations.

**Entry point:** `propagateImplicitRelations()` in `src/lib/data/propagation/index.ts`:

```typescript
function propagateImplicitRelations(data: GraphData): GraphData
```

**Global fixed-point loop.** Because Phase 6 (succinctness downgrades via query differences) may alter `M_s`, which could enable further upgrades in Phase 1 or further query propagation in Phases 3–5, the entire pipeline is wrapped in a global `while(globalChanged)` loop:

```
Phase 0: Validate adjacency consistency (throws on contradiction)
while (globalChanged) {
    Phase 1: Succinctness upgrades (fixed-point)
    Phase 2: Succinctness downgrades (fixed-point)
    Phases 3–5: Query/transformation propagation (fixed-point)
    Phase 6: Succinctness downgrades via query differences
    if Phase 6 made changes → globalChanged = true
}
```

In practice, the global loop converges in 1–2 iterations.

---

## 5. Phase 1: Succinctness Upgrades

An **upgrade** changes an `unknown` status to `poly` (or `unknown-poly-quasi`, etc.).

**Implementation:** `phaseOneUpgrade()` in `edge-propagation.ts`:

```typescript
function phaseOneUpgrade(
  matrix: KCAdjacencyMatrix,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] }
): number  // returns count of upgrades applied
```

**Algorithm.** Compute reachability for both `POLY_STATUS` and `QUASI_STATUS`. For each pair `(i, j)`:

1. **Quasi upgrade.** If `j` is quasi-reachable from `i` but `M_s(i, j)` does not already guarantee quasi:
   - If `M_s(i, j) = no-quasi`, throw a contradiction error.
   - If `M_s(i, j) = no-poly-unknown-quasi`, upgrade to `no-poly-quasi` using `applyNoPolyQuasiUpgrade()` (preserves original `noPolyDescription`, adds derived `quasiDescription`).
   - Otherwise, upgrade to `unknown-poly-quasi`.

2. **Poly upgrade.** If `j` is poly-reachable from `i` but `M_s(i, j)` does not already guarantee poly:
   - If current status contradicts poly (e.g., `no-poly-quasi`), throw.
   - Otherwise, set to `poly`.

**Description template (poly):**
> `{srcName} compiles to {intermediate₁} in polynomial time \citet{...}. {intermediate₁} compiles to {intermediate₂} in polynomial time \citet{...}. … Therefore a polynomial compilation exists from {srcName} to {tgtName}.`

**Fixed-point.** The upgrade loop repeats while any changes occur. Each edge can only be upgraded a bounded number of times (at most 3 upgrades through the status lattice), so the loop converges in O(|L|⁴) worst-case time, though in practice 2–3 passes suffice.

When handling the full status set `S`, quasi upgrades are applied first per iteration, then poly upgrades. This ordering is important because a quasi upgrade (e.g., `unknown-both` → `unknown-poly-quasi`) may be a prerequisite for a later poly upgrade.

---

## 6. Phase 2: Succinctness Downgrades

A **downgrade** changes an `unknown` status to `no-poly` (or `no-poly-unknown-quasi`, etc.).

**Implementation:** `tryDowngrade()` in `edge-propagation.ts`:

```typescript
function tryDowngrade(
  data: GraphData,
  source: number,
  target: number,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] }
): boolean  // returns true if a downgrade was applied
```

**Algorithm (trial-and-contradiction).** For each edge `(i, j)` whose status allows a downgrade:

1. **Trial poly.** Temporarily set `M_s(i, j) = poly` and run `validateAdjacencyConsistency()`. If a contradiction is found, then `poly` is impossible. Use the contradiction's witness path and the existing negative edge that was violated to construct a description explaining why.

2. **Trial quasi (for full `S` only).** If the poly trial did not contradict, also try setting the edge to `unknown-poly-quasi`. If that contradicts, we can rule out quasi-polynomial as well.

3. **Restore original.** The edge is always restored after each trial; the actual downgrade is applied only when a contradiction is confirmed.

**Description template (no-poly downgrade):**
> `If {srcName} compiles to {tgtName} in polynomial time, then since {A} compiles to {B} in polynomial time \citet{...}, we would have {A} compiles to {C} in polynomial time. This contradicts the fact that {A} cannot compile to {C} in polynomial time \citet{...}.`

**Fixed-point.** Downgrades also run to a fixed point: one downgrade may expose a new contradiction on another edge. Cost per iteration: O(|L|²) edges × O(|L|²) consistency check = O(|L|⁴). Over O(|L|²) iterations, total worst-case: O(|L|⁶).

When handling `S`: within each iteration, we first try `poly`, then (if no contradiction) try `unknown-poly-quasi`. This interleaving is critical for correctness—without it, we might miss opportunities to downgrade both the poly and quasi components.

---

## 7. Query/Transformation Propagation (Phases 3–5)

After Phase 2, `M̃_s` is finalized (ignoring Phase 6), so we propagate `M̃_o`. The orchestration is handled by `propagateQueryOperations()` in `index.ts`, which runs Phases 3–5 in tightly interleaved fixed-point loops.

**Orchestration structure:**

```
// Phases 3+4 (upgrades): poly first, then quasi
while (polyChanged) {
    recompute reachability (POLY_STATUS, QUASI_STATUS)
    Phase 3: propagateQueriesViaSuccinctness(data, reachP, reachQ, polyOnly=true)
    Phase 4: propagateQueriesViaLemmas(data, OPERATION_LEMMAS, polyOnly=true)
}
while (quasiChanged) {
    recompute reachability
    Phase 3: propagateQueriesViaSuccinctness(data, reachP, reachQ, polyOnly=false)
    Phase 4: propagateQueriesViaLemmas(data, OPERATION_LEMMAS, polyOnly=false)
}

// Phase 5 (downgrades)
while (downgradeChanged) {
    recompute reachability
    Phase 5a: propagateQueryDowngrades(data, reachP, reachQ)
    Phase 5b: propagateDowngradesViaLemmaContrapositives(data, OPERATION_LEMMAS)
}

// Post-propagation: validateQueryConsistency(data)
```

### 7.1 Phase 3: Upgrades via Succinctness

Uses the query-by-compiling principle: if `L₁ ≤_p L₂` and `L₂` supports `q`, then `L₁` supports `q`.

**Implementation:** `propagateQueriesViaSuccinctness()` in `query-propagation.ts`:

```typescript
function propagateQueriesViaSuccinctness(
  data: GraphData,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] },
  polyOnly: boolean
): boolean
```

When `polyOnly=true`, only poly-reachable paths are considered. When `false`, quasi-reachable paths are also used (yielding quasi-polynomial operation support).

**Description template (poly):**
> `Since {srcName} compiles to {tgtName} in polynomial time \citet{...}, and {tgtName} supports {opCode} \citet{...}, then {srcName} supports {opCode} as well.`

For multi-hop paths, each intermediate compilation step is listed.

Cost: O(|L|² · |Q|) per iteration.

### 7.2 Phase 4: Upgrades via Lemmas

For each language `L` and each lemma `(antecedent → consequent)`: if `L` supports all antecedent operations, set `L.consequent` to `poly`.

**Implementation:** `propagateQueriesViaLemmas()` in `query-propagation.ts`:

```typescript
function propagateQueriesViaLemmas(
  data: GraphData,
  lemmas: OperationLemma[],
  polyOnly: boolean
): boolean
```

**Description template:**
> `Since {langName} supports {opCode} \citet{lemma.refs}.`

The description consists of just the first summary sentence from the lemma, citing the lemma's references. Proof sketches are omitted for conciseness.

Cost: O(|F_l| · |L|) per iteration.

### 7.3 Phase 5a: Downgrades via Succinctness (Contrapositive)

Contrapositive of query-by-compiling: if `L₁` is unsupported for `q` and `L₁ ≤_p L₂`, then `L₂` is unsupported for `q`.

**Implementation:** `propagateQueryDowngrades()` in `query-propagation.ts`:

```typescript
function propagateQueryDowngrades(
  data: GraphData,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] }
): boolean
```

**Description template (no-poly):**
> `Since {opCode} implies {otherOp} \citet{...}, and since {otherOp} is unsupported by {langName} \citet{...}, then {opCode} is unsupported by {langName} as well.`

This uses the word "implies" (not →) for human readability, and "is unsupported by" for negative results.

Cost: O(|L|² · |Q|) per iteration.

### 7.4 Phase 5b: Downgrades via Lemma Contrapositives

For each lemma `(o₁ ∧ … ∧ oₙ ⇒ o_{n+1})` and each language `L`: if `L` is unsupported for `o_{n+1}` and `L` supports all antecedents except one `oₖ` (whose status is `unknown`), then `L.oₖ = no-poly`—otherwise the lemma would force `L` to support `o_{n+1}`, a contradiction.

**Implementation:** `propagateDowngradesViaLemmaContrapositives()` in `query-propagation.ts`:

```typescript
function propagateDowngradesViaLemmaContrapositives(
  data: GraphData,
  lemmas: OperationLemma[]
): boolean
```

**Description template:**
> `Since {consequent} implies {antecedent₁} \citet{...}, and since {antecedent₁} is unsupported by {langName} \citet{...}, then {consequent} is unsupported by {langName} as well.`

In theory, this phase can downgrade operations for **transformations** as well as queries. In practice, no such transformation downgrades are currently applicable.

Cost: O(|L| · |F_l|) per iteration.

---

## 8. Phase 6: Succinctness Downgrades via Query Differences

This phase derives negative succinctness edges from differences in operation support between languages.

**Principle (contrapositive of query-by-compiling):** If `L₁` supports `q` but `L₂` is unsupported for `q`, then `L₂ ≰_p L₁`—for otherwise we could compile `L₂` to `L₁` and query there.

**Implementation:** `propagateSuccinctnessViaQueries()` in `query-propagation.ts`:

```typescript
function propagateSuccinctnessViaQueries(data: GraphData): boolean
```

For each pair `(L₁, L₂)` and each query `q`: if `L₁.q = poly` and `L₂.q = no-poly` and `M_s(L₂, L₁) = unknown`, set `M_s(L₂, L₁) = no-poly`.

**Description template:**
> `Since {L₁} supports {q} \citet{...}, and {q} is unsupported by {L₂} \citet{...}, then {L₂} cannot compile to {L₁} in polynomial time.`

**Global feedback.** Because Phase 6 modifies `M_s`, it may enable further Phase 1 upgrades or Phase 2 downgrades. This is why the global fixed-point loop exists—Phase 6's output feeds back into Phases 1–2 until convergence.

Cost: O(|L|² · |Q|) per iteration. In practice, the global loop requires no more than 2 iterations.

---

## 9. Description Generation

All derived entries carry human-readable descriptions with inline LaTeX citations (`\citet{ref1,ref2}`). The formatting helpers in `helpers.ts` are:

| Helper | Purpose |
|--------|---------|
| `formatCitations(refs)` | Returns `" \citet{ref1,ref2}"` with leading space, or empty string |
| `formatCaveat(caveat)` | Returns `" unless {caveat}"` or empty string |
| `describePath(pathIds, matrix)` | Joins per-hop descriptions: `"{A} compiles to {B} in polynomial time \citet{...}."` |
| `phraseForStatus(status)` | Returns `"in polynomial time"`, `"in quasi-polynomial time"`, etc. |
| `buildNoPolyQuasiDescription(noPoly, quasi)` | Combines two `DescriptionComponent`s for composite statuses |

### Composite status descriptions (`no-poly-quasi`)

Edges with status `no-poly-quasi` have **two independent claims** (no polynomial compilation + quasi-polynomial compilation exists). Each claim may be independently manual or derived. The `DirectedSuccinctnessRelation` stores:

- `noPolyDescription: DescriptionComponent` — proof for the "no poly" claim
- `quasiDescription: DescriptionComponent` — proof for the "quasi exists" claim
- `derived: boolean` — true only if **both** components are derived

The combined description is:
> `First, we show no polynomial compilation exists.`
> `{noPolyDescription}`
>
> `Now, we show a quasi-polynomial compilation exists.`
> `{quasiDescription}`

### Caveat display for partial statuses

When an edge description contains a semicolon (e.g., `"No polynomial compilation unless P=NP; quasi-polynomial unknown"`), the UI splits at the semicolon and inserts the caveat after the first clause:
> `No polynomial compilation **unless P=NP**; quasi-polynomial unknown`

This is handled by `splitStatusLabel()` in `EdgeInfo.svelte` and `OperationInfo.svelte`.

---

## 10. Post-Propagation Validation

After all phases complete, `validateQueryConsistency()` runs as a final guard:

```typescript
function validateQueryConsistency(data: GraphData): { ok: boolean; error?: string }
```

This checks that no poly-reachable pair `(L₁, L₂)` has a query supported by `L₂` but unsupported by `L₁`. If such a contradiction exists, propagation throws an error—indicating a bug in the data or the propagator itself.

---

## 11. Meta-Knowledge Compilation

The knowledge base can be encoded as a propositional CNF formula, compiled to d-DNNF, and queried for model counting and surprise analysis. This provides an independent verification that the graph-based propagation is both **sound** (derives nothing beyond what the axioms entail) and **complete** (derives everything the axioms entail).

### Encoding

For the `v` active languages (excluding in-progress languages with no known edges), we introduce two Boolean variables per ordered pair `(i, j)` with `i ≠ j`:
- `P_ij`: a polynomial compilation `L_i → L_j` exists
- `Q_ij`: a quasi-polynomial compilation exists

The invariant `P_ij ⇒ Q_ij` is encoded as `(¬P_ij ∨ Q_ij)`.

Known facts become unit clauses. Transitivity yields 3-literal clauses over all triples:
```
∀ i,j,k: (¬P_ij ∨ ¬P_jk ∨ P_ik) and (¬Q_ij ∨ ¬Q_jk ∨ Q_ik)
```

### Verification

The set of entailed literals from the d-DNNF matches exactly the set of known and derived facts from the graph-based propagation (zero discrepancies in either direction).

### Surprise Analysis

For each free variable `v` and truth value `val ∈ {⊤, ⊥}`, the surprise of the hypothetical result `v = val` is:

```
surprise(v = val) = log₂(MC(Σ) / MC(Σ | v = val))
```

Higher surprise means the result eliminates a larger fraction of consistent worlds.

**Research value** captures the informativeness of an open problem regardless of outcome:

```
RV(v) = surprise(v = ⊤) · surprise(v = ⊥)
```

The dedicated graph algorithms remain preferable for the web application because they produce **informative witness paths**—human-readable chains of citations and intermediate edges explaining *why* each derived fact holds—whereas the compiled representation only answers "entailed or not."

---

## 12. Summary of Complexity Bounds

| Phase | Algorithm | Cost per iteration | Iterations | Total |
|-------|-----------|-------------------|------------|-------|
| 0 | Adjacency validation | O(\|L\|²) | 1 | O(\|L\|²) |
| 1 | Succinctness upgrades | O(\|L\|²) | O(\|L\|²) | O(\|L\|⁴) |
| 2 | Succinctness downgrades | O(\|L\|⁴) | O(\|L\|²) | O(\|L\|⁶) |
| 3 | Query upgrades (succinctness) | O(\|L\|² · \|Q\|) | O(\|L\|²) | O(\|L\|⁴ · \|Q\|) |
| 4 | Query upgrades (lemmas) | O(\|F_l\| · \|L\|) | O(\|F_l\| · \|L\|) | O(\|F_l\|² · \|L\|²) |
| 5a | Query downgrades (succinctness) | O(\|L\|² · \|Q\|) | O(\|L\|²) | O(\|L\|⁴ · \|Q\|) |
| 5b | Query downgrades (lemma contrapositives) | O(\|F_l\| · \|L\|) | O(\|F_l\| · \|L\|) | O(\|F_l\|² · \|L\|²) |
| 6 | Succinctness by query | O(\|L\|² · \|Q\|) | — | O(\|L\|² · \|Q\|) |

In practice, the 28 languages and ~12 lemmas converge in 2–3 fixed-point passes per phase, yielding ~318 derived edges in under a second.
