import type { GraphData, KCAdjacencyMatrix, KCLanguage, KCOpSupport, OperationLemma, DescriptionComponent } from '../../types.js';
import { idToName } from '../../utils/language-id.js';
import { getAllQueryCodes, QUERIES, TRANSFORMATIONS } from '../operations.js';
import {
  DEBUG_PROPAGATION,
  POLY_STATUS,
  QUASI_STATUS,
  computeReachability,
  reconstructPathIndices,
  ensurePath,
  collectCaveatsUnion,
  formatCitations,
  buildNoPolyQuasiDescription,
  contradictionError
} from './helpers.js';

// =============================================================================
// Reachability type with parent tracking for path reconstruction
// =============================================================================
type Reachability = { reach: boolean[][]; parent: number[][] };

/**
 * Merge multiple optional caveats into a single caveat string.
 * Returns undefined if no caveats, a single caveat if only one unique,
 * or caveats joined with " OR " if multiple unique caveats.
 */
function mergeCaveats(...caveats: (string | undefined)[]): string | undefined {
  const set = new Set<string>();
  for (const c of caveats) {
    if (c) set.add(c);
  }
  if (set.size === 0) return undefined;
  return Array.from(set).join(' OR ');
}

/**
 * Collect edge caveats along the reachability path from source to target.
 */
function collectPathCaveats(
  sourceIdx: number,
  targetIdx: number,
  parent: number[][],
  matrix: KCAdjacencyMatrix
): string | undefined {
  const pathIndices = reconstructPathIndices(sourceIdx, targetIdx, parent[sourceIdx]);
  const path = ensurePath(pathIndices, sourceIdx, targetIdx);
  return collectCaveatsUnion(path, matrix);
}

/** Map an operation safe key (e.g. AND_C) to its human-readable label (e.g. Conjunction). */
function opLabel(code: string): string {
  const q = QUERIES[code];
  if (q) return q.label;
  const t = TRANSFORMATIONS[code];
  if (t) return t.label;
  return code;
}

/** Statuses that assert "no polynomial" */
const NO_POLY_QUERY_STATUSES = new Set<string>(['no-poly-unknown-quasi', 'no-poly-quasi', 'no-quasi']);
/** Statuses that assert "no quasi-polynomial" (only no-quasi; no-poly-quasi means quasi EXISTS) */
const NO_QUASI_QUERY_STATUSES = new Set<string>(['no-quasi']);

function getOperationSupport(language: KCLanguage, opCode: string): KCOpSupport | undefined {
  return language.properties?.queries?.[opCode] ?? language.properties?.transformations?.[opCode];
}

function setQuerySupport(language: KCLanguage, queryCode: string, support: KCOpSupport): void {
  if (!language.properties) {
    language.properties = {};
  }
  if (!language.properties.queries) {
    language.properties.queries = {};
  }
  language.properties.queries[queryCode] = support;
}

function getQueryComplexity(language: KCLanguage, queryCode: string): string {
  const support = language.properties?.queries?.[queryCode];
  return support?.complexity ?? 'unknown-to-us';
}

function queryGuaranteesPoly(complexity: string): boolean {
  return complexity === 'poly';
}

function queryGuaranteesQuasi(complexity: string): boolean {
  return QUASI_STATUS.has(complexity);
}

function queryAssertsNoPoly(complexity: string): boolean {
  return NO_POLY_QUERY_STATUSES.has(complexity);
}

function queryAssertsNoQuasi(complexity: string): boolean {
  return NO_QUASI_QUERY_STATUSES.has(complexity);
}

/**
 * Phase 3: Propagate query support via succinctness.
 * If L1 -> L2 in poly/quasi and L2 supports query q, then L1 supports q.
 */
export function propagateQueriesViaSuccinctness(
  data: GraphData,
  reachP: Reachability,
  reachQ: Reachability,
  polyOnly: boolean
): boolean {
  let changed = false;
  const { adjacencyMatrix, languages } = data;
  const queryCodes = getAllQueryCodes();

  for (const queryCode of queryCodes) {
    for (let l2Idx = 0; l2Idx < languages.length; l2Idx++) {
      const l2 = languages[l2Idx];
      const l2Id = l2.id;
      const l2MatrixIdx = adjacencyMatrix.indexByLanguage[l2Id];
      if (l2MatrixIdx === undefined) continue;

      const l2Complexity = getQueryComplexity(l2, queryCode);

      // Check poly upgrades
      if (polyOnly && queryGuaranteesPoly(l2Complexity)) {
        const l2Support = getOperationSupport(l2, queryCode);
        for (let l1Idx = 0; l1Idx < languages.length; l1Idx++) {
          const l1 = languages[l1Idx];
          const l1Id = l1.id;
          const l1MatrixIdx = adjacencyMatrix.indexByLanguage[l1Id];
          if (l1MatrixIdx === undefined) continue;
          if (l1MatrixIdx === l2MatrixIdx) continue;

          if (reachP.reach[l1MatrixIdx][l2MatrixIdx]) {
            const l1Complexity = getQueryComplexity(l1, queryCode);
            if (!queryGuaranteesPoly(l1Complexity)) {
              // Upgrade L1's query to poly
              const l1Name = idToName(l1Id);
              const l2Name = idToName(l2Id);
              const l2Refs = l2.properties?.queries?.[queryCode]?.refs ?? [];
              const description = `${l1Name} compiles to ${l2Name} in polynomial time, and ${l2Name} supports ${opLabel(queryCode)} in polynomial time${formatCitations(l2Refs)}. Therefore ${l1Name} supports ${opLabel(queryCode)} in polynomial time.`;
              
              // Merge caveats from the edge path and L2's query caveat
              const pathCaveat = collectPathCaveats(l1MatrixIdx, l2MatrixIdx, reachP.parent, adjacencyMatrix);
              const queryCaveat = l2Support?.caveat;
              const caveat = mergeCaveats(pathCaveat, queryCaveat);

              if (DEBUG_PROPAGATION) {
                console.log(`[Query Propagation] UPGRADE ${l1Name}.${queryCode}: ${l1Complexity} -> poly`);
              }
              
              setQuerySupport(l1, queryCode, {
                complexity: 'poly',
                refs: l2.properties?.queries?.[queryCode]?.refs ?? [],
                derived: true,
                description,
                ...(caveat && { caveat })
              });
              changed = true;
            }
          }
        }
      }

      // Check quasi upgrades
      if (!polyOnly && queryGuaranteesQuasi(l2Complexity)) {
        const l2Support = getOperationSupport(l2, queryCode);
        for (let l1Idx = 0; l1Idx < languages.length; l1Idx++) {
          const l1 = languages[l1Idx];
          const l1Id = l1.id;
          const l1MatrixIdx = adjacencyMatrix.indexByLanguage[l1Id];
          if (l1MatrixIdx === undefined) continue;
          if (l1MatrixIdx === l2MatrixIdx) continue;

          if (reachQ.reach[l1MatrixIdx][l2MatrixIdx]) {
            const l1Complexity = getQueryComplexity(l1, queryCode);
            // Don't upgrade if L1 already guarantees quasi OR if L1 asserts no-quasi
            // (no-quasi means it's proven impossible, so we can't upgrade it)
            if (queryGuaranteesQuasi(l1Complexity) || queryAssertsNoQuasi(l1Complexity)) continue;

            // Upgrade L1's query to quasi
            const l1Name = idToName(l1Id);
            const l2Name = idToName(l2Id);
            const newComplexity = l1Complexity === 'no-poly-unknown-quasi' ? 'no-poly-quasi' : 'unknown-poly-quasi';
            const l2Refs = l2.properties?.queries?.[queryCode]?.refs ?? [];
            const description = `${l1Name} compiles to ${l2Name} in quasi-polynomial time, and ${l2Name} supports ${opLabel(queryCode)} in quasi-polynomial time${formatCitations(l2Refs)}. Therefore ${l1Name} supports ${opLabel(queryCode)} in at most quasi-polynomial time.`;
            
            // Merge caveats from the edge path and L2's query caveat
            const pathCaveat = collectPathCaveats(l1MatrixIdx, l2MatrixIdx, reachQ.parent, adjacencyMatrix);
            const queryCaveat = l2Support?.caveat;
            const caveat = mergeCaveats(pathCaveat, queryCaveat);

            if (DEBUG_PROPAGATION) {
              console.log(`[Query Propagation] UPGRADE ${l1Name}.${queryCode}: ${l1Complexity} -> ${newComplexity}`);
            }
            
            setQuerySupport(l1, queryCode, {
              complexity: newComplexity,
              refs: l2.properties?.queries?.[queryCode]?.refs ?? [],
              derived: true,
              description,
              ...(caveat && { caveat })
            });
            changed = true;
          }
        }
      }
    }
  }

  return changed;
}

/**
 * Phase 4: Propagate query support via operation lemmas.
 * If L supports all antecedent operations, then L supports the consequent.
 */
export function propagateQueriesViaLemmas(
  data: GraphData,
  lemmas: OperationLemma[],
  polyOnly: boolean
): boolean {
  let changed = false;

  for (const language of data.languages) {
    for (const lemma of lemmas) {
      // Check if all antecedent operations are supported
      let allSupported = true;
      let worstComplexity = 'poly'; // Start with best, find worst
      const antecedentCaveats: (string | undefined)[] = [];

      for (const antecedentOp of lemma.antecedent) {
        const support = getOperationSupport(language, antecedentOp);
        if (!support) {
          allSupported = false;
          break;
        }

        antecedentCaveats.push(support.caveat);
        const complexity = support.complexity;
        if (polyOnly) {
          if (!queryGuaranteesPoly(complexity)) {
            allSupported = false;
            break;
          }
        } else {
          if (!queryGuaranteesQuasi(complexity)) {
            allSupported = false;
            break;
          }
          // Track worst complexity for quasi case
          if (complexity === 'unknown-poly-quasi' || complexity === 'no-poly-quasi') {
            worstComplexity = complexity;
          }
        }
      }

      if (!allSupported) continue;

      // Check if consequent can be upgraded
      const consequentSupport = getOperationSupport(language, lemma.consequent);
      const consequentComplexity = consequentSupport?.complexity ?? 'unknown-to-us';

      const targetComplexity = polyOnly ? 'poly' : worstComplexity;

      // Only upgrade if current complexity is worse
      const shouldUpgrade = polyOnly
        ? !queryGuaranteesPoly(consequentComplexity)
        : !queryGuaranteesQuasi(consequentComplexity);

      if (shouldUpgrade) {
        const langName = idToName(language.id);
        const antecedentNames = lemma.antecedent.map(opLabel).join(', ');
        const description = `Since ${langName} supports ${antecedentNames}, it also supports ${opLabel(lemma.consequent)}${formatCitations(lemma.refs)}.`;

        // Merge caveats from all antecedent operations
        const caveat = mergeCaveats(...antecedentCaveats);

        if (DEBUG_PROPAGATION) {
          console.log(`[Query Propagation] LEMMA ${langName}.${lemma.consequent}: ${consequentComplexity} -> ${targetComplexity} (via ${lemma.id})`);
        }

        // Determine if this is a query or transformation
        const isQuery = lemma.consequent in (QUERIES ?? {});
        if (isQuery) {
          setQuerySupport(language, lemma.consequent, {
            complexity: targetComplexity,
            refs: lemma.refs,
            derived: true,
            description,
            ...(caveat && { caveat })
          });
        } else {
          // Transformation consequent
          if (!language.properties) language.properties = {};
          if (!language.properties.transformations) language.properties.transformations = {};
          language.properties.transformations[lemma.consequent] = {
            complexity: targetComplexity,
            refs: lemma.refs,
            derived: true,
            description,
            ...(caveat && { caveat })
          };
        }
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Phase 5: Propagate query downgrades.
 * 
 * Simple algorithm:
 * - For language L1 with L1.X = no-poly:
 *   - For language L2 downstream of L1 (L1 -> L2 in poly):
 *     - Set L2.X to no-poly-unknown-quasi (unless L2 already asserts no-poly)
 * 
 * - For language L1 with L1.X = no-quasi:
 *   - For language L2 downstream of L1 (L1 -> L2 in quasi):
 *     - Set L2.X to no-quasi (unless L2 already asserts no-quasi)
 */
export function propagateQueryDowngrades(
  data: GraphData,
  reachP: Reachability,
  reachQ: Reachability
): boolean {
  let changed = false;
  const { adjacencyMatrix, languages } = data;
  const queryCodes = getAllQueryCodes();

  for (const queryCode of queryCodes) {
    for (const l1 of languages) {
      const l1MatrixIdx = adjacencyMatrix.indexByLanguage[l1.id];
      if (l1MatrixIdx === undefined) continue;

      const l1Complexity = getQueryComplexity(l1, queryCode);
      const l1Name = idToName(l1.id);

      // No-poly propagation: L1 has no-poly, propagate via poly edges
      if (queryAssertsNoPoly(l1Complexity)) {
        const l1Support = getOperationSupport(l1, queryCode);
        for (const l2 of languages) {
          if (l2.id === l1.id) continue;
          const l2MatrixIdx = adjacencyMatrix.indexByLanguage[l2.id];
          if (l2MatrixIdx === undefined) continue;

          // Check if L1 -> L2 in poly
          if (!reachP.reach[l1MatrixIdx][l2MatrixIdx]) continue;

          const l2Complexity = getQueryComplexity(l2, queryCode);
          // Skip if L2 already asserts no-poly
          if (queryAssertsNoPoly(l2Complexity)) continue;

          const l2Name = idToName(l2.id);
          const l1Refs = l1.properties?.queries?.[queryCode]?.refs ?? [];
          const description = `${opLabel(queryCode)} is unsupported by ${l1Name}${formatCitations(l1Refs)}, and ${l1Name} compiles to ${l2Name} in polynomial time. If ${l2Name} supported ${opLabel(queryCode)} in polynomial time, then ${l1Name} could too by compiling first. Therefore ${opLabel(queryCode)} is unsupported by ${l2Name}.`;

          // Merge caveats from L1's query and the edge path
          const pathCaveat = collectPathCaveats(l1MatrixIdx, l2MatrixIdx, reachP.parent, adjacencyMatrix);
          const queryCaveat = l1Support?.caveat;
          const caveat = mergeCaveats(pathCaveat, queryCaveat);

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] DOWNGRADE ${l2Name}.${queryCode}: ${l2Complexity} -> no-poly-unknown-quasi`);
          }

          setQuerySupport(l2, queryCode, {
            complexity: 'no-poly-unknown-quasi',
            refs: l1.properties?.queries?.[queryCode]?.refs ?? [],
            derived: true,
            description,
            ...(caveat && { caveat })
          });
          changed = true;
        }
      }

      // No-quasi propagation: L1 has no-quasi, propagate via quasi edges
      if (queryAssertsNoQuasi(l1Complexity)) {
        const l1Support = getOperationSupport(l1, queryCode);
        for (const l2 of languages) {
          if (l2.id === l1.id) continue;
          const l2MatrixIdx = adjacencyMatrix.indexByLanguage[l2.id];
          if (l2MatrixIdx === undefined) continue;

          // Check if L1 -> L2 in quasi
          if (!reachQ.reach[l1MatrixIdx][l2MatrixIdx]) continue;

          const l2Complexity = getQueryComplexity(l2, queryCode);
          // Skip if L2 already asserts no-quasi
          if (queryAssertsNoQuasi(l2Complexity)) continue;

          const l2Name = idToName(l2.id);
          const l1Refs = l1.properties?.queries?.[queryCode]?.refs ?? [];
          const description = `${opLabel(queryCode)} is unsupported by ${l1Name} in quasi-polynomial time${formatCitations(l1Refs)}, and ${l1Name} compiles to ${l2Name} in quasi-polynomial time. If ${l2Name} supported ${opLabel(queryCode)} in quasi-polynomial time, then ${l1Name} could too by compiling first. Therefore ${opLabel(queryCode)} is unsupported by ${l2Name} in quasi-polynomial time.`;

          // Merge caveats from L1's query and the edge path
          const pathCaveat = collectPathCaveats(l1MatrixIdx, l2MatrixIdx, reachQ.parent, adjacencyMatrix);
          const queryCaveat = l1Support?.caveat;
          const caveat = mergeCaveats(pathCaveat, queryCaveat);

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] DOWNGRADE ${l2Name}.${queryCode}: ${l2Complexity} -> no-quasi`);
          }

          setQuerySupport(l2, queryCode, {
            complexity: 'no-quasi',
            refs: l1.properties?.queries?.[queryCode]?.refs ?? [],
            derived: true,
            description,
            ...(caveat && { caveat })
          });
          changed = true;
        }
      }
    }
  }

  return changed;
}

/**
 * Phase 5b: Propagate query downgrades via lemma contrapositives.
 * 
 * For a lemma A1 ∧ A2 ∧ ... ∧ An -> C (all antecedents together imply consequent):
 * Contrapositive: ¬C -> ¬A1 ∨ ¬A2 ∨ ... ∨ ¬An
 * 
 * We can only infer a specific antecedent is false when:
 * - C is false (no-poly or no-quasi)
 * - All OTHER antecedents are TRUE (supported in poly or quasi)
 * - Then the remaining antecedent must be false
 * 
 * Example: [CO, CD] -> ME (consistency + conditioning implies model enumeration)
 * - If ME is no-poly AND CD is poly → CO must be no-poly
 * - If ME is no-poly AND CO is poly → CD must be no-poly
 * 
 * Example: [EQ] -> CO (equivalence implies consistency)
 * - If CO is no-poly → EQ must be no-poly (single antecedent, trivially all others true)
 */
export function propagateDowngradesViaLemmaContrapositives(
  data: GraphData,
  lemmas: OperationLemma[]
): boolean {
  let changed = false;

  for (const language of data.languages) {
    const langName = idToName(language.id);

    for (const lemma of lemmas) {
      // Get the consequent's complexity
      const consequentSupport = getOperationSupport(language, lemma.consequent);
      const consequentComplexity = consequentSupport?.complexity ?? 'unknown-to-us';

      // Check no-poly contrapositive
      if (queryAssertsNoPoly(consequentComplexity)) {
        // For each antecedent Aj, check if all OTHER antecedents are supported in poly
        for (let j = 0; j < lemma.antecedent.length; j++) {
          const targetOp = lemma.antecedent[j];
          const targetSupport = getOperationSupport(language, targetOp);
          const targetComplexity = targetSupport?.complexity ?? 'unknown-to-us';

          // Skip if target already asserts no-poly
          if (queryAssertsNoPoly(targetComplexity)) continue;

          // Check if ALL OTHER antecedents support poly
          let allOthersPolySupported = true;
          const otherAntecedents: string[] = [];
          const otherCaveats: (string | undefined)[] = [];
          for (let k = 0; k < lemma.antecedent.length; k++) {
            if (k === j) continue;
            const otherOp = lemma.antecedent[k];
            otherAntecedents.push(otherOp);
            const otherSupport = getOperationSupport(language, otherOp);
            const otherComplexity = otherSupport?.complexity ?? 'unknown-to-us';
            if (!queryGuaranteesPoly(otherComplexity)) {
              allOthersPolySupported = false;
              break;
            }
            otherCaveats.push(otherSupport?.caveat);
          }

          if (!allOthersPolySupported) continue;

          // All other antecedents support poly, consequent is no-poly → target must be no-poly
          const consequentRefs = consequentSupport?.refs ?? [];
          const othersDesc = otherAntecedents.length > 0 
            ? ` and since ${otherAntecedents.map(opLabel).join(' and ')} ${otherAntecedents.length === 1 ? 'is' : 'are'} supported in polynomial time,`
            : '';
          const description = `Since ${lemma.antecedent.map(opLabel).join(' ∧ ')} implies ${opLabel(lemma.consequent)}${formatCitations(lemma.refs)}, and since ${opLabel(lemma.consequent)} is unsupported by ${langName}${formatCitations(consequentRefs)},${othersDesc} then ${opLabel(targetOp)} is unsupported by ${langName} as well.`;

          // Merge caveats from the consequent and all other antecedents
          const caveat = mergeCaveats(consequentSupport?.caveat, ...otherCaveats);

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] CONTRAPOSITIVE ${langName}.${targetOp}: ${targetComplexity} -> no-poly-unknown-quasi (via ¬${lemma.consequent}${otherAntecedents.length > 0 ? ', with ' + otherAntecedents.join('+') + ' supported' : ''})`);
          }

          // Determine if this is a query or transformation
          const isQuery = targetOp in (QUERIES ?? {});
          if (isQuery) {
            setQuerySupport(language, targetOp, {
              complexity: 'no-poly-unknown-quasi',
              refs: consequentSupport?.refs ?? lemma.refs,
              derived: true,
              description,
              ...(caveat && { caveat })
            });
          } else {
            if (!language.properties) language.properties = {};
            if (!language.properties.transformations) language.properties.transformations = {};
            language.properties.transformations[targetOp] = {
              complexity: 'no-poly-unknown-quasi',
              refs: consequentSupport?.refs ?? lemma.refs,
              derived: true,
              description,
              ...(caveat && { caveat })
            };
          }
          changed = true;
        }
      }

      // Check no-quasi contrapositive
      if (queryAssertsNoQuasi(consequentComplexity)) {
        // For each antecedent Aj, check if all OTHER antecedents are supported in quasi
        for (let j = 0; j < lemma.antecedent.length; j++) {
          const targetOp = lemma.antecedent[j];
          const targetSupport = getOperationSupport(language, targetOp);
          const targetComplexity = targetSupport?.complexity ?? 'unknown-to-us';

          // Skip if target already asserts no-quasi
          if (queryAssertsNoQuasi(targetComplexity)) continue;

          // Check if ALL OTHER antecedents support quasi
          let allOthersQuasiSupported = true;
          const otherAntecedents: string[] = [];
          const otherCaveats: (string | undefined)[] = [];
          for (let k = 0; k < lemma.antecedent.length; k++) {
            if (k === j) continue;
            const otherOp = lemma.antecedent[k];
            otherAntecedents.push(otherOp);
            const otherSupport = getOperationSupport(language, otherOp);
            const otherComplexity = otherSupport?.complexity ?? 'unknown-to-us';
            if (!queryGuaranteesQuasi(otherComplexity)) {
              allOthersQuasiSupported = false;
              break;
            }
            otherCaveats.push(otherSupport?.caveat);
          }

          if (!allOthersQuasiSupported) continue;

          // All other antecedents support quasi, consequent is no-quasi → target must be no-quasi
          const consequentRefs = consequentSupport?.refs ?? [];
          const othersDesc = otherAntecedents.length > 0 
            ? ` and since ${otherAntecedents.map(opLabel).join(' and ')} ${otherAntecedents.length === 1 ? 'is' : 'are'} supported in quasi-polynomial time,`
            : '';
          const description = `Since ${lemma.antecedent.map(opLabel).join(' ∧ ')} implies ${opLabel(lemma.consequent)}${formatCitations(lemma.refs)}, and since ${opLabel(lemma.consequent)} is unsupported by ${langName} in quasi-polynomial time${formatCitations(consequentRefs)},${othersDesc} then ${opLabel(targetOp)} is unsupported by ${langName} in quasi-polynomial time as well.`;

          // Merge caveats from the consequent and all other antecedents
          const caveat = mergeCaveats(consequentSupport?.caveat, ...otherCaveats);

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] CONTRAPOSITIVE ${langName}.${targetOp}: ${targetComplexity} -> no-quasi (via ¬${lemma.consequent}${otherAntecedents.length > 0 ? ', with ' + otherAntecedents.join('+') + ' supported' : ''})`);
          }

          // Determine if this is a query or transformation
          const isQuery = targetOp in (QUERIES ?? {});
          if (isQuery) {
            setQuerySupport(language, targetOp, {
              complexity: 'no-quasi',
              refs: consequentSupport?.refs ?? lemma.refs,
              derived: true,
              description,
              ...(caveat && { caveat })
            });
          } else {
            if (!language.properties) language.properties = {};
            if (!language.properties.transformations) language.properties.transformations = {};
            language.properties.transformations[targetOp] = {
              complexity: 'no-quasi',
              refs: consequentSupport?.refs ?? lemma.refs,
              derived: true,
              description,
              ...(caveat && { caveat })
            };
          }
          changed = true;
        }
      }
    }
  }

  return changed;
}

// =============================================================================
// Phase 6: Succinctness by Query
// =============================================================================

/** Edge statuses that already assert "no polynomial compilation" */
const EDGE_NO_POLY = new Set<string>(['no-poly-unknown-quasi', 'no-poly-quasi', 'no-quasi']);

/**
 * Phase 6: Derive succinctness (edge) results from query differences.
 *
 * Lemma "Succinctness by Query":
 * If language A supports query Q in polynomial time, and language B does NOT
 * support Q in polynomial time, then B cannot be compiled to A in
 * polynomial time.
 *
 * Proof: If B → A were poly, then B supports Q by first compiling to A (poly)
 * then running A's poly-time query algorithm. But B doesn't support Q in poly.
 * Contradiction.
 *
 * Similarly for quasi-polynomial time.
 *
 * NOTE: This lemma applies only to QUERIES, not transformations. Transformations
 * are language-specific operations that don't transfer via compilation.
 */
export function propagateSuccinctnessViaQueries(data: GraphData): boolean {
  let changed = false;
  const { adjacencyMatrix, languages } = data;
  const queryCodes = getAllQueryCodes();

  for (const queryCode of queryCodes) {
    for (const langA of languages) {
      const aIdx = adjacencyMatrix.indexByLanguage[langA.id];
      if (aIdx === undefined) continue;
      const aComplexity = getQueryComplexity(langA, queryCode);
      const aSupport = getOperationSupport(langA, queryCode);

      for (const langB of languages) {
        if (langB.id === langA.id) continue;
        const bIdx = adjacencyMatrix.indexByLanguage[langB.id];
        if (bIdx === undefined) continue;
        const bComplexity = getQueryComplexity(langB, queryCode);
        const bSupport = getOperationSupport(langB, queryCode);

        // === Poly case ===
        // A supports Q in poly, B asserts no-poly for Q → B → A is not poly
        if (queryGuaranteesPoly(aComplexity) && queryAssertsNoPoly(bComplexity)) {
          if (deriveNoPolyEdge(adjacencyMatrix, bIdx, aIdx, langB, langA, queryCode, aSupport, bSupport)) {
            changed = true;
          }
        }

        // === Quasi case ===
        // A supports Q in quasi, B has no-quasi for Q → B → A is not quasi
        // NOTE: Only 'no-quasi' means "no quasi algorithm exists".
        // 'no-poly-quasi' means quasi EXISTS (just not poly), so it does not qualify.
        if (queryGuaranteesQuasi(aComplexity) && bComplexity === 'no-quasi') {
          if (deriveNoQuasiEdge(adjacencyMatrix, bIdx, aIdx, langB, langA, queryCode, aSupport, bSupport)) {
            changed = true;
          }
        }
      }
    }
  }

  return changed;
}

/**
 * Derive a no-poly edge B → A from query difference evidence.
 * Returns true if the edge was changed.
 */
function deriveNoPolyEdge(
  adjacencyMatrix: KCAdjacencyMatrix,
  bIdx: number,
  aIdx: number,
  langB: KCLanguage,
  langA: KCLanguage,
  queryCode: string,
  aSupport: KCOpSupport | undefined,
  bSupport: KCOpSupport | undefined
): boolean {
  const currentRelation = adjacencyMatrix.matrix[bIdx][aIdx];
  const currentStatus = currentRelation?.status ?? null;

  // Skip if already asserts no-poly
  if (currentStatus !== null && EDGE_NO_POLY.has(currentStatus)) return false;

  const aName = idToName(langA.id);
  const bName = idToName(langB.id);

  // Contradiction: edge claims poly but we derived no-poly
  if (currentStatus === 'poly') {
    contradictionError(
      `Contradiction (succinctness by query): ${bName} → ${aName} is marked as poly, ` +
      `but ${aName} supports ${opLabel(queryCode)} in polynomial time while ${opLabel(queryCode)} is unsupported by ${bName}. ` +
      `If the polynomial compilation existed, ${bName} could support ${opLabel(queryCode)} by compiling to ${aName}.`
    );
  }

  const aRefs = aSupport?.refs ?? [];
  const bRefs = bSupport?.refs ?? [];
  const description =
    `${aName} supports ${opLabel(queryCode)} in polynomial time${formatCitations(aRefs)}, but ${opLabel(queryCode)} is unsupported ` +
    `by ${bName}${formatCitations(bRefs)}. If ${bName} could compile to ${aName} in ` +
    `polynomial time, ${bName} could support ${opLabel(queryCode)} by first compiling to ${aName}. ` +
    `Therefore ${bName} cannot compile to ${aName} in polynomial time.`;
  const caveat = mergeCaveats(aSupport?.caveat, bSupport?.caveat);
  const refs = [...new Set([...(aSupport?.refs ?? []), ...(bSupport?.refs ?? [])])];

  if (currentStatus === 'unknown-poly-quasi' && currentRelation) {
    // Transition: unknown-poly-quasi → no-poly-quasi (structured proof)
    const quasiDescription = currentRelation.quasiDescription ?? {
      description: currentRelation.description ?? '',
      refs: currentRelation.refs ?? [],
      derived: currentRelation.derived ?? false
    };
    const noPolyDescription: DescriptionComponent = {
      description,
      refs,
      derived: true
    };
    const allRefs = [...new Set([...noPolyDescription.refs, ...quasiDescription.refs])];

    // Merge caveats: query-derived caveat + original relation caveat
    const allCaveats = new Set<string>();
    if (caveat) {
      for (const c of caveat.split(' OR ')) allCaveats.add(c.trim());
    }
    if (currentRelation.caveat) {
      for (const c of currentRelation.caveat.split(' OR ')) allCaveats.add(c.trim());
    }
    const mergedCaveat = allCaveats.size > 0 ? Array.from(allCaveats).join(' OR ') : undefined;

    const fullyDerived = noPolyDescription.derived && quasiDescription.derived;

    adjacencyMatrix.matrix[bIdx][aIdx] = {
      status: 'no-poly-quasi',
      refs: allRefs,
      caveat: mergedCaveat,
      separatingFunctionIds: currentRelation.separatingFunctionIds,
      hidden: false,
      derived: fullyDerived,
      noPolyDescription,
      quasiDescription,
      description: buildNoPolyQuasiDescription(noPolyDescription, quasiDescription)
    };
  } else {
    // Transition: null / unknown-both → no-poly-unknown-quasi
    adjacencyMatrix.matrix[bIdx][aIdx] = {
      status: 'no-poly-unknown-quasi',
      refs,
      caveat,
      separatingFunctionIds: undefined,
      hidden: false,
      derived: true,
      description
    };
  }

  if (DEBUG_PROPAGATION) {
    console.log(
      `[Succinctness by Query] EDGE ${bName} → ${aName}: ` +
      `${currentStatus ?? 'null'} → ${adjacencyMatrix.matrix[bIdx][aIdx]!.status} (via ${queryCode} poly)`
    );
  }
  return true;
}

/**
 * Derive a no-quasi edge B → A from query difference evidence.
 * Returns true if the edge was changed.
 */
function deriveNoQuasiEdge(
  adjacencyMatrix: KCAdjacencyMatrix,
  bIdx: number,
  aIdx: number,
  langB: KCLanguage,
  langA: KCLanguage,
  queryCode: string,
  aSupport: KCOpSupport | undefined,
  bSupport: KCOpSupport | undefined
): boolean {
  const currentRelation = adjacencyMatrix.matrix[bIdx][aIdx];
  const currentStatus = currentRelation?.status ?? null;

  // Skip if already asserts no-quasi
  if (currentStatus === 'no-quasi') return false;

  const aName = idToName(langA.id);
  const bName = idToName(langB.id);

  // Contradiction: edge guarantees quasi exists, but we derived no-quasi
  if (currentStatus === 'poly' || currentStatus === 'unknown-poly-quasi' || currentStatus === 'no-poly-quasi') {
    contradictionError(
      `Contradiction (succinctness by query): ${bName} → ${aName} is marked as ${currentStatus} ` +
      `(guaranteeing quasi-poly), but ${aName} supports ${opLabel(queryCode)} in quasi-polynomial time ` +
      `while ${opLabel(queryCode)} is unsupported by ${bName} in quasi-polynomial time. If the quasi-polynomial ` +
      `compilation existed, ${bName} could support ${opLabel(queryCode)} by compiling to ${aName}.`
    );
  }

  const aRefs = aSupport?.refs ?? [];
  const bRefs = bSupport?.refs ?? [];
  const description =
    `${aName} supports ${opLabel(queryCode)} in quasi-polynomial time${formatCitations(aRefs)}, but ${opLabel(queryCode)} is ` +
    `unsupported by ${bName} in quasi-polynomial time${formatCitations(bRefs)}. If ${bName} could compile to ${aName} in ` +
    `quasi-polynomial time, ${bName} could support ${opLabel(queryCode)} by first compiling to ${aName}. ` +
    `Therefore ${bName} cannot compile to ${aName} in quasi-polynomial time.`;
  const queryCaveat = mergeCaveats(aSupport?.caveat, bSupport?.caveat);
  // Merge with existing edge caveat (e.g., from a prior no-poly-unknown-quasi derivation)
  const caveat = mergeCaveats(queryCaveat, currentRelation?.caveat);
  const refs = [...new Set([...(aSupport?.refs ?? []), ...(bSupport?.refs ?? []), ...(currentRelation?.refs ?? [])])];

  // Transition: null / unknown-both / no-poly-unknown-quasi → no-quasi
  adjacencyMatrix.matrix[bIdx][aIdx] = {
    status: 'no-quasi',
    refs,
    caveat,
    separatingFunctionIds: currentRelation?.separatingFunctionIds,
    hidden: false,
    derived: true,
    description
  };

  if (DEBUG_PROPAGATION) {
    console.log(
      `[Succinctness by Query] EDGE ${bName} → ${aName}: ` +
      `${currentStatus ?? 'null'} → no-quasi (via ${queryCode} quasi)`
    );
  }
  return true;
}

/**
 * Validate query consistency.
 * Checks for contradictions:
 * 1. If L1 -> L2 and L2 supports q, but L1 claims no support (upgrade direction)
 * 2. If L1 doesn't support q and L1 -> L2, but L2 claims to support q (downgrade direction)
 * (If you can compile L1 to L2 and L2 supports a query, L1 must also support it.)
 */
export function validateQueryConsistency(data: GraphData): { ok: boolean; error?: string } {
  const { adjacencyMatrix, languages } = data;
  const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
  const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
  const queryCodes = getAllQueryCodes();

  for (const queryCode of queryCodes) {
    for (let l1Idx = 0; l1Idx < languages.length; l1Idx++) {
      const l1 = languages[l1Idx];
      const l1Id = l1.id;
      const l1MatrixIdx = adjacencyMatrix.indexByLanguage[l1Id];
      if (l1MatrixIdx === undefined) continue;

      const l1Complexity = getQueryComplexity(l1, queryCode);

      for (let l2Idx = 0; l2Idx < languages.length; l2Idx++) {
        const l2 = languages[l2Idx];
        const l2Id = l2.id;
        const l2MatrixIdx = adjacencyMatrix.indexByLanguage[l2Id];
        if (l2MatrixIdx === undefined) continue;
        if (l1MatrixIdx === l2MatrixIdx) continue;

        const l2Complexity = getQueryComplexity(l2, queryCode);
        const l1Name = idToName(l1Id);
        const l2Name = idToName(l2Id);

        // Check poly contradiction: L1 -> L2, L2 supports q in poly, but L1 claims no-poly
        if (reachP.reach[l1MatrixIdx][l2MatrixIdx]) {
          if (queryGuaranteesPoly(l2Complexity) && queryAssertsNoPoly(l1Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} compiles to ${l2Name} in polynomial time, and ${l2Name} supports ${opLabel(queryCode)} in polynomial time, but ${opLabel(queryCode)} is marked as unsupported by ${l1Name}.`
            };
          }
        }

        // Check quasi contradiction: L1 -> L2, L2 supports q in quasi, but L1 claims no-quasi
        if (reachQ.reach[l1MatrixIdx][l2MatrixIdx]) {
          if (queryGuaranteesQuasi(l2Complexity) && queryAssertsNoQuasi(l1Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} compiles to ${l2Name} in quasi-polynomial time, and ${l2Name} supports ${opLabel(queryCode)} in quasi-polynomial time, but ${opLabel(queryCode)} is marked as unsupported by ${l1Name} in quasi-polynomial time.`
            };
          }
        }
      }
    }
  }

  return { ok: true };
}
