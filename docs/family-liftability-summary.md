Family-Level Liftability Summary (2026-04-29)

Scope:
- Succinctness edges only.
- Explicit, non-derived union-level results only.
- Only union languages with corresponding family nodes are compared:
  cSDD/cSDD_T, d-SDNNF/d-SDNNF_T, dec-SDNNF/dec-SDNNF_T,
  nOBDD/nOBDD_<, OBDD/OBDD_<, SDD/SDD_T, SDNNF/SDNNF_T, uOBDD/uOBDD_<.

Status table:
| Family dual | Target status | Upper bound | Lower bound | Overall |
| --- | --- | --- | --- | --- |
| dec-SDNNF_T -> OBDD_< | no-poly-quasi | Closed (quasi-note.tex) | Closed | Added explicit edge |
| SDNNF_T -> nOBDD_< | no-poly-quasi | Closed (quasi-note.tex) | Closed | Added explicit edge |
| d-SDNNF_T -> uOBDD_< | no-poly-quasi | Closed (quasi-note.tex corollary) | Closed | Added explicit edge |
| SDD_T -> FBDD | no-quasi | N/A | Closed | Added explicit edge; union-level authored claim purged |
| uOBDD_< -> OBDD_< | no-quasi | N/A | Closed | Added explicit edge after review |
| cSDD_T -> OBDD_< | no-quasi | N/A | Closed | Added explicit edge after review |
| d-SDNNF_T -> SDD_T | no-poly-unknown-quasi | N/A for current status | Closed | Added explicit edge after review |

Union-endpoint explicit claim audit:
| Explicit claim touching a union language | Status | Family dual | Dual state |
| --- | --- | --- | --- |
| cSDD_T -> cSDD | poly | cSDD_T -> cSDD_T | Identity; no separate edge needed |
| cSDD -> OBDD | no-quasi | cSDD_T -> OBDD_< | Explicit no-quasi |
| cSDD -> SDD | poly | cSDD_T -> SDD_T | Explicit poly |
| d-SDNNF_T -> d-SDNNF | poly | d-SDNNF_T -> d-SDNNF_T | Identity; no separate edge needed |
| d-SDNNF -> d-DNNF | poly | d-SDNNF_T -> d-DNNF | Derived poly |
| d-SDNNF -> SDD | no-poly-unknown-quasi | d-SDNNF_T -> SDD_T | Explicit no-poly-unknown-quasi |
| d-SDNNF -> SDNNF | poly | d-SDNNF_T -> SDNNF_T | Explicit poly |
| d-SDNNF -> uOBDD | no-poly-quasi | d-SDNNF_T -> uOBDD_< | Explicit no-poly-quasi |
| dec-SDNNF_T -> dec-SDNNF | poly | dec-SDNNF_T -> dec-SDNNF_T | Identity; no separate edge needed |
| dec-SDNNF -> d-SDNNF | poly | dec-SDNNF_T -> d-SDNNF_T | Explicit poly |
| dec-SDNNF -> dec-DNNF | poly | dec-SDNNF_T -> dec-DNNF | Derived poly |
| dec-SDNNF -> OBDD | no-poly-quasi | dec-SDNNF_T -> OBDD_< | Explicit no-poly-quasi |
| DNF -> d-SDNNF | no-quasi | DNF -> d-SDNNF_T | Derived no-quasi |
| FBDD -> SDNNF | no-quasi | FBDD -> SDNNF_T | Derived no-quasi |
| nOBDD_< -> nOBDD | poly | nOBDD_< -> nOBDD_< | Identity; no separate edge needed |
| nOBDD -> nFBDD | poly | nOBDD_< -> nFBDD | Derived poly |
| nOBDD -> SDNNF | poly | nOBDD_< -> SDNNF_T | Explicit poly |
| OBDD_< -> OBDD | poly | OBDD_< -> OBDD_< | Identity; no separate edge needed |
| OBDD -> cSDD | poly | OBDD_< -> cSDD_T | Explicit poly |
| OBDD -> dec-SDNNF | poly | OBDD_< -> dec-SDNNF_T | Explicit poly |
| OBDD -> FBDD | poly | OBDD_< -> FBDD | Derived poly |
| OBDD -> OBDD_< | no-quasi | OBDD_< -> OBDD_< | Identity; cross-order lower bound, no dual edge needed |
| OBDD -> uOBDD | poly | OBDD_< -> uOBDD_< | Explicit poly |
| SDD_T -> SDD | poly | SDD_T -> SDD_T | Identity; no separate edge needed |
| SDD -> d-SDNNF | poly | SDD_T -> d-SDNNF_T | Explicit poly |
| SDNNF_T -> SDNNF | poly | SDNNF_T -> SDNNF_T | Identity; no separate edge needed |
| SDNNF -> DNNF | poly | SDNNF_T -> DNNF | Derived poly |
| SDNNF -> nOBDD | no-poly-quasi | SDNNF_T -> nOBDD_< | Explicit no-poly-quasi |
| uOBDD_< -> uOBDD | poly | uOBDD_< -> uOBDD_< | Identity; no separate edge needed |
| uOBDD -> d-SDNNF | poly | uOBDD_< -> d-SDNNF_T | Explicit poly |
| uOBDD -> nOBDD | poly | uOBDD_< -> nOBDD_< | Explicit poly |
| uOBDD -> OBDD | no-quasi | uOBDD_< -> OBDD_< | Explicit no-quasi |
| uOBDD -> uFBDD | poly | uOBDD_< -> uFBDD | Derived poly |

Notes on the union-endpoint audit:
1) Identity duals need no new matrix edge. These are usually union/member bridge claims such as OBDD_< -> OBDD, where replacing the union endpoint by its family member gives L -> L.
2) Poly duals generally hold by the same subset/forget-structure argument as the union claim, or by choosing the corresponding right-linear vtree/order. Most are already explicit or derived.
3) Derived lower-bound duals with a single-language endpoint are acceptable when they follow by the same contradiction path with the family endpoint substituted. Examples include DNF -> d-SDNNF_T, FBDD -> SDD_T, and FBDD -> SDNNF_T.
4) The no-poly side of dec-SDNNF_T -> OBDD_<, SDNNF_T -> nOBDD_<, and d-SDNNF_T -> uOBDD_< is now derived from explicit family-to-language lower bounds. Their missing part is the quasi upper bound.
5) The dec-SDNNF_T -> OBDD_<, SDNNF_T -> nOBDD_<, and d-SDNNF_T -> uOBDD_< quasi upper bounds are supplied by quasi-note.tex. The deterministic-to-unambiguous case is a corollary of the common-order SDNNF simulation plus the Bollig--Buttkus certificate argument.
6) The SDD_T -> FBDD lower bound is stronger than the union-level SDD -> FBDD lower bound: if SDD compiled to FBDD in quasi-polynomial size, then SDD_T -> SDD -> FBDD would contradict SDD_T !-> FBDD.
7) All reviewed lower-bound duals have now been added.

Already matched by explicit family-level result:
1) cSDD -> SDD (poly)
   Dual: cSDD_T -> SDD_T (poly).
   Justification: compressed SDDs are SDDs under the same vtree.

2) d-SDNNF -> SDNNF (poly)
   Dual: d-SDNNF_T -> SDNNF_T (poly).
   Justification: deterministic structured circuits are structured circuits under the same vtree.

3) nOBDD -> SDNNF (poly)
   Dual: nOBDD_< -> SDNNF_T (poly).
   Justification: a fixed variable order induces a right-linear vtree; rewriting decisions as sentential decompositions preserves that structure.

4) SDD -> d-SDNNF (poly)
   Dual: SDD_T -> d-SDNNF_T (poly).
   Justification: SDDs are deterministic structured decomposable circuits respecting the same vtree.

5) uOBDD -> d-SDNNF (poly)
   Dual: uOBDD_< -> d-SDNNF_T (poly).
   Justification: a fixed variable order induces a right-linear vtree, and unambiguity gives determinism.

6) OBDD -> cSDD (poly)
   Dual: OBDD_< -> cSDD_T (poly).
   Justification: a fixed order is a right-linear vtree; reduced/canonical OBDDs embed as compressed SDDs.

7) OBDD -> dec-SDNNF (poly)
   Dual: OBDD_< -> dec-SDNNF_T (poly).
   Justification: fixed-order decision diagrams embed as decision structured DNNFs over the corresponding right-linear vtree.

8) dec-SDNNF -> d-SDNNF (poly)
   Dual: dec-SDNNF_T -> d-SDNNF_T (poly).
   Justification: decision structured DNNFs are deterministic structured DNNFs under the same vtree.

Missing or incomplete explicit family-level duals:
1) dec-SDNNF -> OBDD (no-poly-quasi)
   Desired dual: dec-SDNNF_T -> OBDD_< (no-poly-quasi).
   Current state: explicit family claim added.
   Upper-bound obligation (quasi): already available from quasi-note.tex. It gives a common-order quasipolynomial simulation; the output order is chosen from the source vtree alone.
   Lower-bound obligation (no-poly): lifts cleanly from the union proof. Use dec-SDNNF_T !-> FBDD in polynomial time and OBDD_< -> FBDD in polynomial time; then dec-SDNNF_T -> OBDD_< in polynomial time would imply dec-SDNNF_T -> FBDD.

2) SDNNF -> nOBDD (no-poly-quasi)
   Desired dual: SDNNF_T -> nOBDD_< (no-poly-quasi).
   Current state: explicit family claim added.
   Upper-bound obligation (quasi): supplied by quasi-note.tex; the target order is determined by the source vtree, not by the individual input circuit.
   Lower-bound obligation (no-poly): lifts cleanly from the union proof. Use d-SDNNF_T -> SDNNF_T in polynomial time, nOBDD_< -> nFBDD in polynomial time, and d-SDNNF_T !-> nFBDD in polynomial time; then SDNNF_T -> nOBDD_< in polynomial time would imply d-SDNNF_T -> nFBDD.

3) d-SDNNF -> uOBDD (no-poly-quasi)
   Desired dual: d-SDNNF_T -> uOBDD_< (no-poly-quasi).
   Current state: explicit family claim added.
   Upper-bound obligation (quasi): supplied by quasi-note.tex; the target order is determined by the source vtree, and unambiguity follows from deterministic inputs by the Bollig--Buttkus certificate argument.
   Lower-bound obligation (no-poly): lifts cleanly from the union proof. Use d-SDNNF_T !-> nFBDD in polynomial time and uOBDD_< -> nFBDD in polynomial time; then d-SDNNF_T -> uOBDD_< in polynomial time would imply d-SDNNF_T -> nFBDD.

4) uOBDD -> OBDD (no-quasi)
   Desired dual: uOBDD_< -> OBDD_< (no-quasi).
   Current state: explicit family claim added after review.
   Upper-bound obligation: none; this is a pure lower-bound edge.
   Lower-bound obligation (no-quasi): use the HWB separation. HWB_n has polynomial fixed-order uOBDD_< representations, while Bryant's OBDD lower bound is against every order; the finite source orders can be packed into one global order.

5) cSDD -> OBDD (no-quasi)
   Candidate dual: cSDD_T -> OBDD_< (no-quasi).
   Current state: explicit family claim added after review.
   Upper-bound obligation: none; this is a pure lower-bound edge.
   Lower-bound obligation (no-quasi): use Bova's generalized-HWB construction. The polynomial compressed SDDs respect explicit vtrees, while the OBDD lower bound is against every order by conditioning to HWB_n; the finite source vtrees can be packed into one global vtree.

6) d-SDNNF -> SDD (no-poly-unknown-quasi)
   Candidate dual: d-SDNNF_T -> SDD_T (no-poly-unknown-quasi).
   Current state: explicit family claim added after review.
   Upper-bound obligation: none for the current status; quasi remains unknown.
   Lower-bound obligation (no-poly): Vinall-Smeeth Theorem 1 is sourced by genuinely structured d-DNNFs. In the proof of Theorem 2, they fix a vtree over the constructed unambiguous DNF's variables, compile each term respecting that vtree, and take the deterministic disjunction. The target lower bound is against every SDD, hence every SDD_T target.

Restored after common-order check:
1) SDNNF_T -> nOBDD_< (quasi)
   The family lift is supplied by the vtree leaf-count version of the Bollig--Buttkus simulation in quasi-note.tex.

2) d-SDNNF_T -> uOBDD_< (quasi)
   The deterministic corollary in quasi-note.tex gives the family lift once the common-order SDNNF_T -> nOBDD_< simulation is fixed.

Newly matched by explicit family-level result:
1) OBDD -> uOBDD (poly)
   Dual: OBDD_< -> uOBDD_< (poly).
   Justification: every deterministic fixed-order OBDD is an unambiguous fixed-order OBDD under the same order.

2) uOBDD -> nOBDD (poly)
   Dual: uOBDD_< -> nOBDD_< (poly).
   Justification: every unambiguous fixed-order OBDD is a nondeterministic fixed-order OBDD under the same order.

Likely major non-liftability blockers:
1) The common-order upper-bound blockers are closed by quasi-note.tex.

2) No reviewed pure lower-bound lift remains open in this summary.

3) Family-to-single-language lower bounds should be preferred over their union-level versions when available, because the family result plus the polynomial family-to-union inclusion implies the union result.
