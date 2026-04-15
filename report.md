# Family-Level Claim Review Report (2026-04-12)

## Scope Reviewed

I reviewed:
- `docs/definitions.tex` (language-family and family-succinctness definitions)
- `src/lib/data/propagation/index.ts`, `src/lib/data/propagation/helpers.ts`, `src/lib/data/propagation/edge-propagation.ts`, `src/lib/data/propagation/query-propagation.ts`
- `src/lib/data/validation/semantic.ts`
- all explicit claims in:
  - `docs/succinctness.tex` (93 claims)
  - `docs/queries.tex` (26 claims)
  - `docs/transformations.tex` (65 claims)

Total explicit claims reviewed: 184.

Revision note (2026-04-13): after clarifying quantifier direction in the family definition, the propagation lemmas do hold for language families under the current semantics.

Execution update (2026-04-14): completed the approved Phase 1 claim migrations.
- Added 9 approved family-level succinctness claims (while keeping corresponding language-level claims).
- Migrated 5 approved transformation claims to family-level and removed their language-level versions.

Execution update (2026-04-14, pass 2): completed the approved source-backed quasi family promotions.
- Added `d-SDNNF_T ~> uOBDD_<` and `SDNNF_T ~> nOBDD_<` in `docs/succinctness.tex`.

---

## 1) Propagation vs New Family Definitions

## 1.1 Definition-level observation

Your new family definition is quantifier-based over member languages:
- `docs/definitions.tex:94` defines family succinctness with `for every L2 in F2 there exists L1 in F1 ...`
- `docs/definitions.tex:98` extends language-family comparisons via singleton lifting

So family claims are not just ordinary language claims with renamed nodes; they carry stronger quantifier structure.

## 1.2 Current propagation behavior

Propagation currently treats every node identically and every edge as one uniform transitive relation:
- closure / upgrades: `src/lib/data/propagation/index.ts:33`, `src/lib/data/propagation/edge-propagation.ts:186`
- reachability is untyped: `src/lib/data/propagation/helpers.ts:55`
- query transfer via succinctness is untyped: `src/lib/data/propagation/query-propagation.ts:105`
- query-difference back-propagation to edges is untyped: `src/lib/data/propagation/query-propagation.ts:674`
- consistency validation is untyped: `src/lib/data/validation/semantic.ts:145`

## 1.3 Main finding

With the current family definition, the lemma patterns used by propagation are mathematically valid for families as well. The key clarification is not a change of quantifiers, but notation direction: in $\mathcal{F}_1 \leq \mathcal{F}_2$, the compilation source is $\mathcal{F}_2$ and the compilation target is $\mathcal{F}_1$.

Under that reading, transitivity, contradiction downgrades, query transfer via succinctness, and operation-lemma implications all lift to family-level statements.

## 1.4 What must change before large-scale upgrades

No mandatory algorithmic change is required to make the existing lemma logic valid for families. The practical requirement is to keep the notation mapping explicit in documentation and claims:

- $\mathcal{F}_1 \leq \mathcal{F}_2$ means compilation direction is $\mathcal{F}_2 \to \mathcal{F}_1$.
- family-level claims can be propagated using the same lemmas once this source/target orientation is respected.

Optional hardening (still useful, but not required for correctness): add explicit edge metadata marking language-vs-family nodes to improve explainability of derived paths.

---

## 2) Succinctness Claim Review (docs/succinctness.tex)

I grouped results into:
- high-confidence upgrades (safe based on claim text itself)
- likely upgrades pending theorem-level confirmation
- keep-as-language claims

## 2.1 High-confidence upgrades

These claims explicitly rely on fixed order / fixed vtree structure, so family forms are the stronger, more faithful statement.

| Line | Current claim | Stronger family claim to add | Keep current language claim? | Status |
|---|---|---|---|---|
| 93 | `d-SDNNF -> SDNNF` | `d-SDNNF_T -> SDNNF_T` | Yes | Done |
| 121 | `dec-SDNNF -> d-SDNNF` | `dec-SDNNF_T -> d-SDNNF_T` | Yes | Done |
| 156 | `DNF -> nOBDD` | `DNF -> nOBDD_<` | Yes | Done |
| 214 | `nOBDD -> SDNNF` | `nOBDD_< -> SDNNF_T` | Yes | Done |
| 228 | `OBDD -> dec-SDNNF` | `OBDD_< -> dec-SDNNF_T` | Yes | Done |
| 277 | `uOBDD -> d-SDNNF` | `uOBDD_< -> d-SDNNF_T` | Yes | Done |
| 614 | `OBDD -> cSDD` | `OBDD_< -> cSDD_T` | Yes | Done |
| 633 | `cSDD -> SDD` | `cSDD_T -> SDD_T` | Yes | Done |
| 640 | `SDD -> d-SDNNF` | `SDD_T -> d-SDNNF_T` | Yes | Done |

Reasoning note: these are exactly the kind of claims where the proof construction references fixed variable order or fixed vtree behavior.

## 2.2 Likely upgrades, but needs theorem-level check

| Line | Current claim | Candidate family upgrade | Why not auto-promote yet | Approval status | 
|---|---|---|---|---|
| 100 | `d-SDNNF ~> uOBDD` | `d-SDNNF_T ~> uOBDD_<` | Bollig/Buttkus gives `DNNF_T -> nOBDD` quasipoly and `d-DNNF_T -> uOBDD` (unambiguous) for the same simulation framework | Done |
| 142 | `dec-SDNNF ~> OBDD` | `dec-SDNNF_T ~> OBDD_<` | Bollig/Buttkus gives unambiguous nondeterministic OBDD target, but not an explicit deterministic OBDD theorem for `dec`-restricted inputs | Discuss / needs supplementary argument |
| 249 | `SDNNF ~> nOBDD` | `SDNNF_T ~> nOBDD_<` | Bollig/Butkus theorem is stated directly for `DNNF_T` with quasipoly-size simulation to nondeterministic OBDD | Done |
| 672 | `cSDD !-> OBDD` | `cSDD_T !-> OBDD_<` | requires lower bound quantification over all target orders | Do not approve (this is an open problem I believe)
| 696 | `d-SDNNF !-> SDD` | `d-SDNNF_T !-> SDD_T` | may need same-T or all-T clarification | (also a possible open question) |
| 708 | `DNF !-> OBDD` | `DNF !-> OBDD_<` | follows by transitivity from known claims (`OBDD_< -> OBDD` and `DNF !-> OBDD`) | Ready if approved for Phase 2 |
| 733 | `FBDD !-> OBDD` | `FBDD !-> OBDD_<` | follows by transitivity from known claims (`OBDD_< -> OBDD` and `FBDD !-> OBDD`) | Ready if approved for Phase 2 |

### 2.2A Source-TeX theorem mapping (Bollig/Buttkus)

- `DNNF_T -> nOBDD` (quasipolynomial simulation): main theorem in the source (`theorem:sdnnf_to_vee_obdd`) states any `DNNF_T` has an equivalent nondeterministic OBDD with quasipolynomial blow-up.
- `d-DNNF_T -> uOBDD`: subsequent proposition states the same simulation is unambiguous for deterministic structured inputs.
- The source text repeatedly states the constructed OBDD respects an induced variable ordering. This supports family-target interpretation (`... -> nOBDD_<` / `... -> uOBDD_<`) for fixed-vtree source languages.
- What is not explicitly stated there: a deterministic OBDD target theorem for `dec`-restricted structured inputs. That step remains dependent on additional argumentation (currently captured in the existing claim description rather than a direct Bollig/Buttkus theorem statement).

## 2.3 Claims to keep language-level as-is

I do not recommend converting these to family-only claims:
- subset/union bridge claims already correctly expressed (`OBDD_< -> OBDD`, `SDD_T -> SDD`, `d-SDNNF_T -> d-SDNNF`, etc.). Agreed.
- explicitly cross-order hardness claims about language-level OBDD (`OBDD !-> OBDD_<` etc.). Agreed.
- cases where no corresponding family node currently exists (e.g., `d-DNNF`, `FBDD`, `DNNF`, `PI`, `CNF`, `DNF`, etc.). Agreed.

---

## 3) Query Claim Review (docs/queries.tex)

Main result: no mandatory upgrades found.

Why:
- family-level OBDD claims are already present (`OBDD_<` CO/CT/EQ/ME/VA, lines 189-221)
- language-level OBDD claims (lines 144, 152) are valid corollaries and should remain
- no other query claims were found where the statement is incorrectly language-level but proof intrinsically requires a family endpoint

Suggested action: keep query claims unchanged for now.

---

## 4) Transformation Claim Review (docs/transformations.tex)

## 4.1 High-confidence upgrades

These explicitly require "same vtree" or same-structure assumptions and should be family-level.

| Line | Current claim | Stronger family claim to add | Keep current language claim? | Status |
|---|---|---|---|---|
| 437 | `d-SDNNF` supports `AND_BC` poly | `d-SDNNF_T` supports `AND_BC` poly | NO (remove language-level version) | Done |
| 477 | `SDNNF` supports `AND_BC` poly | `SDNNF_T` supports `AND_BC` poly | NO (same) | Done |
| 493 | `SDNNF` supports `OR_C` poly | `SDNNF_T` supports `OR_C` poly | NO (same) | Done |
| 559 | `SDD` supports `AND_BC` poly | `SDD_T` supports `AND_BC` poly | NO | Done |
| 567 | `SDD` supports `OR_BC` poly | `SDD_T` supports `OR_BC` poly | NO | Done |

## 4.2 Additional likely upgrade

| Line | Current claim | Candidate family upgrade | Note |
|---|---|---|---|
| 469 | `d-SDNNF` supports `FO` not in quasi-poly | add `d-SDNNF_T` same complexity | description already says fixed-vtree case is required |


For these transformation rules, the family formulation is the precise one: operations like bounded conjunction/disjunction are polynomial when two formulas are taken from the same fixed-parameter sublanguage (same order/vtree family member).

## 4.3 Keep language-level

Keep these language-level claims as-is:
- OBDD language claims that intentionally capture cross-order failure (`AND_BC` no-poly, etc.)
- single-formula operations where family-vs-language distinction does not change tractability statement (`NOT_C`, many `CD` cases)

---

## 5) Next Steps Queue

Completed in this pass:
- Added the 9 approved family-level succinctness claims from Section 2.1 while keeping the corresponding language-level claims.
- Migrated the 5 approved transformation claims in Section 4.1 to family-level and removed their language-level versions.

Next steps to go through:
- Discuss the `dec`-specific deterministic-target upgrade in Section 2.2: line 142.
- Keep open-problem rows deferred unless new evidence is provided: lines 672, 696.
- Decide whether to execute Phase 2 transitivity-based upgrades now: lines 708 and 733.
- Decide whether to add the additional likely transformation upgrade at line 469 (`d-SDNNF_T` FO lower bound).

---
