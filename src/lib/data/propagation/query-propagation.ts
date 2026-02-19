import type { GraphData, KCAdjacencyMatrix, KCLanguage, KCOpSupport, OperationLemma } from '../../types.js';
import { idToName } from '../../utils/language-id.js';
import { getAllQueryCodes, QUERIES } from '../operations.js';
import {
  DEBUG_PROPAGATION,
  POLY_STATUS,
  QUASI_STATUS,
  computeReachability,
  reconstructPathIndices,
  ensurePath,
  collectCaveatsUnion
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

/** Statuses that assert "no polynomial" */
const NO_POLY_QUERY_STATUSES = new Set<string>(['no-poly-unknown-quasi', 'no-poly-quasi', 'no-quasi']);
/** Statuses that assert "no quasi-polynomial" */
const NO_QUASI_QUERY_STATUSES = new Set<string>(['no-quasi', 'no-poly-quasi']);
/** Statuses that are unknown and can be upgraded/downgraded */
const UNKNOWN_QUERY_STATUSES = new Set<string>(['unknown-both', 'unknown-to-us']);

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
              const description = `${l1Name} transforms to ${l2Name} in polynomial time, and ${l2Name} supports ${queryCode} in polynomial time. Therefore ${l1Name} supports ${queryCode} in polynomial time.`;
              
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
            const description = `${l1Name} transforms to ${l2Name} in quasi-polynomial time, and ${l2Name} supports ${queryCode}. Therefore ${l1Name} supports ${queryCode} in at most quasi-polynomial time.`;
            
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
        const antecedentNames = lemma.antecedent.join(', ');
        const description = `Since ${langName} supports ${antecedentNames}, it also supports ${lemma.consequent}. ${lemma.description}`;

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
          const description = `${l1Name} does not support ${queryCode} in polynomial time, and ${l1Name} transforms to ${l2Name} in polynomial time. If ${l2Name} supported ${queryCode} in polynomial time, then ${l1Name} could too by transforming first. Therefore ${l2Name} does not support ${queryCode} in polynomial time.`;

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
          const description = `${l1Name} does not support ${queryCode} in quasi-polynomial time, and ${l1Name} transforms to ${l2Name} in quasi-polynomial time. If ${l2Name} supported ${queryCode}, then ${l1Name} could too by transforming first. Therefore ${l2Name} does not support ${queryCode} in quasi-polynomial time.`;

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
          const othersDesc = otherAntecedents.length > 0 
            ? ` Since ${otherAntecedents.join(' and ')} ${otherAntecedents.length === 1 ? 'is' : 'are'} supported in polynomial time,`
            : '';
          const description = `Since ${lemma.antecedent.join(' ∧ ')} → ${lemma.consequent},${othersDesc} if ${langName} cannot support ${lemma.consequent} in polynomial time, it cannot support ${targetOp} in polynomial time either.`;

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
          const othersDesc = otherAntecedents.length > 0 
            ? ` Since ${otherAntecedents.join(' and ')} ${otherAntecedents.length === 1 ? 'is' : 'are'} supported in quasi-polynomial time,`
            : '';
          const description = `Since ${lemma.antecedent.join(' ∧ ')} → ${lemma.consequent},${othersDesc} if ${langName} cannot support ${lemma.consequent} in quasi-polynomial time, it cannot support ${targetOp} in quasi-polynomial time either.`;

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

/**
 * Validate query consistency.
 * Checks for contradictions:
 * 1. If L1 -> L2 and L2 supports q, but L1 claims no support (upgrade direction)
 * 2. If L1 doesn't support q and L1 -> L2, but L2 claims to support q (downgrade direction)
 * (If you can transform L1 to L2 and L2 supports a query, L1 must also support it.)
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

        // Check poly contradiction (upgrade direction): L1 -> L2, L2 supports q in poly, but L1 claims no-poly
        if (reachP.reach[l1MatrixIdx][l2MatrixIdx]) {
          if (queryGuaranteesPoly(l2Complexity) && queryAssertsNoPoly(l1Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} transforms to ${l2Name} in polynomial time, and ${l2Name} supports ${queryCode} in polynomial time, but ${l1Name} is marked as not supporting ${queryCode} in polynomial time.`
            };
          }
          // Check poly contradiction (downgrade direction): L1 -> L2, L1 claims no-poly, but L2 supports q in poly
          if (queryAssertsNoPoly(l1Complexity) && queryGuaranteesPoly(l2Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} does not support ${queryCode} in polynomial time and transforms to ${l2Name} in polynomial time, but ${l2Name} is marked as supporting ${queryCode} in polynomial time.`
            };
          }
        }

        // Check quasi contradiction (upgrade direction): L1 -> L2, L2 supports q in quasi, but L1 claims no-quasi
        if (reachQ.reach[l1MatrixIdx][l2MatrixIdx]) {
          if (queryGuaranteesQuasi(l2Complexity) && queryAssertsNoQuasi(l1Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} transforms to ${l2Name} in quasi-polynomial time, and ${l2Name} supports ${queryCode} in quasi-polynomial time, but ${l1Name} is marked as not supporting ${queryCode} in quasi-polynomial time.`
            };
          }
          // Check quasi contradiction (downgrade direction): L1 -> L2, L1 claims no-quasi, but L2 supports q
          if (queryAssertsNoQuasi(l1Complexity) && queryGuaranteesQuasi(l2Complexity)) {
            return {
              ok: false,
              error: `Contradiction: ${l1Name} does not support ${queryCode} in quasi-polynomial time and transforms to ${l2Name} in quasi-polynomial time, but ${l2Name} is marked as supporting ${queryCode} in quasi-polynomial time.`
            };
          }
        }
      }
    }
  }

  return { ok: true };
}
