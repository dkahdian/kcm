import type { GraphData, DirectedSuccinctnessRelation, KCAdjacencyMatrix, DescriptionComponent, KCOpSupport, KCLanguage, OperationLemma } from '../types.js';
import {
  validateAdjacencyConsistency,
  guaranteesPoly,
  guaranteesQuasi,
  collectRefsUnion
} from './validation/semantic.js';
import { initNameMap, idToName } from '../utils/language-id.js';
import { OPERATION_LEMMAS } from './query-lemmas.js';
import { getAllQueryCodes, QUERIES, TRANSFORMATIONS } from './operations.js';

// Debug flag - set to true to see propagation decisions in console
const DEBUG_PROPAGATION = true;

const POLY_STATUS = new Set<string>(['poly']);
const QUASI_STATUS = new Set<string>(['poly', 'unknown-poly-quasi', 'no-poly-quasi']);

function rebuildIndexMap(languageIds: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  languageIds.forEach((id, idx) => {
    index[id] = idx;
  });
  return index;
}

function initMatrix(size: number, fill: boolean): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(fill));
}

function initParent(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(-1));
}

function computeReachability(matrix: KCAdjacencyMatrix, allowed: Set<string>): { reach: boolean[][]; parent: number[][] } {
  const size = matrix.languageIds.length;
  const reach = initMatrix(size, false);
  const parent = initParent(size);

  for (let source = 0; source < size; source += 1) {
    const visited = new Set<number>();
    const stack: number[] = [source];
    while (stack.length > 0) {
      const current = stack.pop() as number;
      if (visited.has(current)) continue;
      visited.add(current);
      const row = matrix.matrix[current];
      if (!row) continue;
      for (let target = 0; target < size; target += 1) {
        if (target === source) continue;
        const relation = row[target];
        if (!relation) continue;
        if (!allowed.has(relation.status)) continue;
        if (!reach[source][target]) {
          reach[source][target] = true;
          parent[source][target] = current;
        }
        if (!visited.has(target)) {
          stack.push(target);
        }
      }
    }
  }

  return { reach, parent };
}

function reconstructPathIndices(source: number, target: number, parentRow: number[]): number[] {
  const path: number[] = [];
  let cursor = target;
  while (cursor !== -1 && cursor !== source) {
    path.push(cursor);
    cursor = parentRow[cursor];
  }
  if (cursor === source) {
    path.push(source);
    path.reverse();
    return path;
  }
  return [];
}

function ensurePath(path: number[], source: number, target: number): number[] {
  if (path.length >= 2) return path;
  return [source, target];
}

function phraseForStatus(status: string): string {
  switch (status) {
    case 'poly':
      return 'in polynomial time';
    case 'unknown-poly-quasi':
      return 'in at worst quasipolynomial time';
    case 'no-poly-quasi':
      return 'in quasipolynomial time';
    default:
      return 'in unknown time';
  }
}

/**
 * Convert a status code to a human-readable contradiction phrase.
 * E.g., "no-poly-quasi" becomes "This contradicts the fact that X cannot transform to Y in polynomial time"
 */
function formatStatusContradiction(srcName: string, tgtName: string, status: string): string {
  switch (status) {
    case 'no-poly-quasi':
      return `This contradicts the fact that ${srcName} cannot transform to ${tgtName} in polynomial time`;
    case 'no-poly-unknown-quasi':
      return `This contradicts the fact that ${srcName} cannot transform to ${tgtName} in polynomial time`;
    case 'no-quasi':
      return `This contradicts the fact that ${srcName} cannot transform to ${tgtName} in quasipolynomial time`;
    default:
      return `This contradicts the existing relationship from ${srcName} to ${tgtName}`;
  }
}

/**
 * Format reference IDs as inline citations.
 * Returns a string like " \\citet{ref1,ref2}" or empty string if no refs.
 */
function formatCitations(refs: string[]): string {
  if (!refs || refs.length === 0) return '';
  return ` \\citet{${refs.join(',')}}`;
}

/**
 * Format a caveat as an "unless" clause.
 * Returns " unless {caveat}" or empty string if no caveat.
 */
function formatCaveat(caveat: string | undefined): string {
  if (!caveat) return '';
  return ` unless ${caveat}`;
}

/**
 * Collect and merge caveats from all edges along a path.
 * Returns undefined if no caveats, a single caveat if only one,
 * or caveats joined with " OR " if multiple unique caveats.
 */
function collectCaveatsUnion(path: number[], matrix: KCAdjacencyMatrix): string | undefined {
  const caveats = new Set<string>();
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    const relation = matrix.matrix[from]?.[to];
    if (relation?.caveat) {
      caveats.add(relation.caveat);
    }
  }
  if (caveats.size === 0) return undefined;
  return Array.from(caveats).join(' OR ');
}

function describePath(pathIds: string[], matrix: KCAdjacencyMatrix): string {
  const { languageIds } = matrix;
  const parts: string[] = [];
  for (let i = 0; i < pathIds.length - 1; i += 1) {
    const fromId = pathIds[i];
    const toId = pathIds[i + 1];
    const fromIdx = languageIds.indexOf(fromId);
    const toIdx = languageIds.indexOf(toId);
    const relation = matrix.matrix[fromIdx]?.[toIdx];
    const status = relation?.status ?? 'unknown';
    const refs = relation?.refs ?? [];
    const caveat = relation?.caveat;
    parts.push(`${idToName(fromId)} transforms to ${idToName(toId)} ${phraseForStatus(status)}${formatCaveat(caveat)}${formatCitations(refs)}.`);
  }
  return parts.join(' ');
}

/**
 * Build the combined description for a no-poly-quasi edge from its proof components.
 */
function buildNoPolyQuasiDescription(noPolyDescription: DescriptionComponent, quasiDescription: DescriptionComponent): string {
  const parts: string[] = [];
  parts.push('First, we show no polynomial transformation exists.');
  parts.push(noPolyDescription.description);
  parts.push('');
  parts.push('Now, we show a quasipolynomial transformation exists.');
  parts.push(quasiDescription.description);
  return parts.join('\n');
}

/**
 * Extract or create a noPolyDescription from an existing relation.
 * Used when the relation has a "no poly" claim (no-poly-unknown-quasi or no-poly-quasi).
 */
function extractNoPolyDescription(relation: DirectedSuccinctnessRelation | null): DescriptionComponent | null {
  if (!relation) return null;
  
  // If structured proof already exists, use it
  if (relation.noPolyDescription) {
    return relation.noPolyDescription;
  }
  
  // For no-poly-unknown-quasi or no-poly-quasi without structured proof,
  // the description justifies the "no poly" claim
  if (relation.status === 'no-poly-unknown-quasi' || relation.status === 'no-poly-quasi') {
    return {
      description: relation.description ?? '',
      refs: relation.refs ?? [],
      derived: relation.derived ?? false
    };
  }
  
  return null;
}

/**
 * Extract or create a quasiDescription from an existing relation.
 * Used when the relation has a "quasi exists" claim (unknown-poly-quasi or no-poly-quasi).
 */
function extractQuasiDescription(relation: DirectedSuccinctnessRelation | null): DescriptionComponent | null {
  if (!relation) return null;
  
  // If structured proof already exists, use it
  if (relation.quasiDescription) {
    return relation.quasiDescription;
  }
  
  // For unknown-poly-quasi or no-poly-quasi without structured proof,
  // the description justifies the "quasi exists" claim
  if (relation.status === 'unknown-poly-quasi' || relation.status === 'no-poly-quasi') {
    return {
      description: relation.description ?? '',
      refs: relation.refs ?? [],
      derived: relation.derived ?? false
    };
  }
  
  return null;
}

/**
 * Apply a standard upgrade (not no-poly-quasi).
 */
function applySimpleUpgrade(
  matrix: KCAdjacencyMatrix,
  path: number[],
  newStatus: string,
  derivedDescription: string
): void {
  if (path.length === 0) return;
  const { languageIds } = matrix;
  const source = path[0];
  const target = path[path.length - 1];
  const refs = collectRefsUnion(path, matrix);
  const caveat = collectCaveatsUnion(path, matrix);
  const pathIds = path.map((idx) => languageIds[idx]);
  const pathDesc = describePath(pathIds, matrix);
  const description = `${pathDesc} ${derivedDescription}`.trim();
  matrix.matrix[source][target] = {
    status: newStatus,
    refs,
    caveat,
    separatingFunctionIds: undefined,
    hidden: false,
    derived: true,
    description
  } satisfies DirectedSuccinctnessRelation;
}

/**
 * Apply upgrade from no-poly-unknown-quasi to no-poly-quasi.
 * Preserves the original noPolyDescription and adds a derived quasiDescription.
 */
function applyNoPolyQuasiUpgrade(
  matrix: KCAdjacencyMatrix,
  sourceIdx: number,
  targetIdx: number,
  path: number[],
  originalRelation: DirectedSuccinctnessRelation
): void {
  const { languageIds } = matrix;
  const srcName = idToName(languageIds[sourceIdx]);
  const tgtName = idToName(languageIds[targetIdx]);
  
  // Extract original noPolyDescription
  const noPolyDescription = extractNoPolyDescription(originalRelation) ?? {
    description: originalRelation.description ?? '',
    refs: originalRelation.refs ?? [],
    derived: originalRelation.derived ?? false
  };
  
  // Create derived quasiDescription
  const pathIds = path.map((idx) => languageIds[idx]);
  const pathDesc = describePath(pathIds, matrix);
  const quasiDesc = `${pathDesc} Therefore a quasi-polynomial transformation exists from ${srcName} to ${tgtName}.`;
  const quasiRefs = collectRefsUnion(path, matrix);
  const quasiDescription: DescriptionComponent = {
    description: quasiDesc,
    refs: quasiRefs,
    derived: true
  };
  
  // Combine refs from both proofs
  const allRefs = [...new Set([...noPolyDescription.refs, ...quasiDescription.refs])];
  
  // Merge caveats: original caveat + path caveats
  const pathCaveat = collectCaveatsUnion(path, matrix);
  const originalCaveat = originalRelation.caveat;
  const allCaveats = new Set<string>();
  if (originalCaveat) allCaveats.add(originalCaveat);
  if (pathCaveat) {
    for (const c of pathCaveat.split(' OR ')) {
      allCaveats.add(c.trim());
    }
  }
  const mergedCaveat = allCaveats.size > 0 ? Array.from(allCaveats).join(' OR ') : undefined;
  
  // derived = true only if BOTH proofs are derived
  const fullyDerived = noPolyDescription.derived && quasiDescription.derived;
  
  matrix.matrix[sourceIdx][targetIdx] = {
    status: 'no-poly-quasi',
    refs: allRefs,
    caveat: mergedCaveat,
    separatingFunctionIds: originalRelation.separatingFunctionIds,
    hidden: false,
    derived: fullyDerived,
    noPolyDescription,
    quasiDescription,
    description: buildNoPolyQuasiDescription(noPolyDescription, quasiDescription)
  } satisfies DirectedSuccinctnessRelation;
}

function contradictionError(message: string): never {
  throw new Error(message);
}

function phaseOneUpgrade(
  matrix: KCAdjacencyMatrix,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] }
): number {
  const { languageIds } = matrix;
  const size = languageIds.length;
  let changes = 0;

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      if (i === j) continue;
      const relation = matrix.matrix[i][j];
      const status = relation?.status ?? null;
      const srcName = idToName(languageIds[i]);
      const tgtName = idToName(languageIds[j]);

      // Quasi upgrades
      if (reachQ.reach[i][j] && !guaranteesQuasi(status)) {
        if (status === 'no-quasi') {
          const path = ensurePath(reconstructPathIndices(i, j, reachQ.parent[i]), i, j);
          const ids = path.map((idx) => languageIds[idx]);
          const desc = describePath(ids, matrix);
          contradictionError(
            `Contradiction: ${desc} Therefore ${srcName} transforms to ${tgtName} in quasipolynomial time, but ${srcName} is marked as not transforming to ${tgtName} in quasipolynomial time.`
          );
        }
        const path = ensurePath(reconstructPathIndices(i, j, reachQ.parent[i]), i, j);
        const newStatus = status === 'no-poly-unknown-quasi' ? 'no-poly-quasi' : 'unknown-poly-quasi';
        if (DEBUG_PROPAGATION) {
          console.log(`[Propagation] UPGRADE ${srcName} -> ${tgtName}: ${status ?? 'null'} -> ${newStatus}`);
        }
        
        if (status === 'no-poly-unknown-quasi' && relation) {
          // Special case: use structured proof components
          applyNoPolyQuasiUpgrade(matrix, i, j, path, relation);
        } else {
          // Standard upgrade to unknown-poly-quasi
          const derivedDesc = `Therefore a quasi-polynomial transformation exists from ${srcName} to ${tgtName}.`;
          applySimpleUpgrade(matrix, path, newStatus, derivedDesc);
        }
        changes += 1;
        continue; // allow re-evaluation in next fixed-point iteration
      }

      // Poly upgrades
      if (reachP.reach[i][j] && !guaranteesPoly(status)) {
        if (status === 'no-poly-quasi' || status === 'no-poly-unknown-quasi' || status === 'no-quasi') {
          const path = ensurePath(reconstructPathIndices(i, j, reachP.parent[i]), i, j);
          const ids = path.map((idx) => languageIds[idx]);
          const desc = describePath(ids, matrix);
          contradictionError(
            `Contradiction: ${desc} Therefore ${srcName} transforms to ${tgtName} in polynomial time, but ${srcName} is marked as not transforming to ${tgtName} in polynomial time.`
          );
        }
        const path = ensurePath(reconstructPathIndices(i, j, reachP.parent[i]), i, j);
        const derivedDesc = `Therefore a polynomial transformation exists from ${srcName} to ${tgtName}.`;
        if (DEBUG_PROPAGATION) {
          console.log(`[Propagation] UPGRADE ${srcName} -> ${tgtName}: ${status ?? 'null'} -> poly`);
        }
        applySimpleUpgrade(matrix, path, 'poly', derivedDesc);
        changes += 1;
      }
    }
  }

  return changes;
}

function tryDowngrade(
  data: GraphData,
  source: number,
  target: number,
  reachP: { reach: boolean[][]; parent: number[][] },
  reachQ: { reach: boolean[][]; parent: number[][] }
): boolean {
  const { adjacencyMatrix } = data;
  const relation = adjacencyMatrix.matrix[source][target];
  const status = relation?.status ?? null;
  const languageIds = adjacencyMatrix.languageIds;
  const srcName = idToName(languageIds[source]);
  const tgtName = idToName(languageIds[target]);

  const runConsistency = (nextStatus: string): { ok: boolean; witnessPath?: string[]; error?: string } => {
    const original = adjacencyMatrix.matrix[source][target];
    adjacencyMatrix.matrix[source][target] = {
      status: nextStatus,
      refs: original?.refs ?? [],
      hidden: original?.hidden ?? false,
      derived: true,
      description: original?.description,
      separatingFunctionIds: undefined
    } satisfies DirectedSuccinctnessRelation;
    const result = validateAdjacencyConsistency(data);
    // always restore the original relation after the trial
    adjacencyMatrix.matrix[source][target] = original ?? null;
    return result;
  };

  const buildContradictionDescription = (
    triedStatus: string,
    witnessIds: string[],
    mergedCaveat?: string
  ): string => {
    // witnessIds is the path that would exist if the tested edge had `triedStatus`
    // The contradiction is that the path endpoints have an incompatible status
    if (witnessIds.length < 2) {
      return `If ${srcName} transforms to ${tgtName} ${phraseForStatus(triedStatus)}, a contradiction arises.`;
    }

    const pathStart = witnessIds[0];
    const pathEnd = witnessIds[witnessIds.length - 1];
    const pathStartName = idToName(pathStart);
    const pathEndName = idToName(pathEnd);

    // Get the actual status of the path endpoints (the contradiction)
    const startIdx = languageIds.indexOf(pathStart);
    const endIdx = languageIds.indexOf(pathEnd);
    const actualRelation = adjacencyMatrix.matrix[startIdx]?.[endIdx];
    const actualStatus = actualRelation?.status ?? 'unknown';
    const actualRefs = actualRelation?.refs ?? [];

    // Build description of existing edges in the path (excluding the tested edge)
    const existingEdges: string[] = [];
    for (let i = 0; i < witnessIds.length - 1; i++) {
      const fromId = witnessIds[i];
      const toId = witnessIds[i + 1];
      // Skip the edge we're testing
      if (fromId === languageIds[source] && toId === languageIds[target]) continue;
      const fromIdx = languageIds.indexOf(fromId);
      const toIdx = languageIds.indexOf(toId);
      const edgeRelation = adjacencyMatrix.matrix[fromIdx]?.[toIdx];
      const edgeStatus = edgeRelation?.status ?? 'unknown';
      const edgeRefs = edgeRelation?.refs ?? [];
      const edgeCaveat = edgeRelation?.caveat;
      existingEdges.push(`${idToName(fromId)} transforms to ${idToName(toId)} ${phraseForStatus(edgeStatus)}${formatCaveat(edgeCaveat)}${formatCitations(edgeRefs)}`);
    }

    const existingPart = existingEdges.length > 0 ? existingEdges.join('. ') + '. ' : '';
    const triedPhrase = phraseForStatus(triedStatus);
    const impliedPhrase = triedStatus === 'poly' ? 'in polynomial time' : 'in at most quasi-polynomial time';
    const contradictionPhrase = formatStatusContradiction(pathStartName, pathEndName, actualStatus);

    return `${existingPart}If ${srcName} transforms to ${tgtName} ${triedPhrase}, then ${pathStartName} transforms to ${pathEndName} ${impliedPhrase}. ${contradictionPhrase}${formatCaveat(mergedCaveat)}${formatCitations(actualRefs)}.`;
  };

  /**
   * Calculate the merged caveat from the witness path and contradicting edge.
   * This should be called before buildContradictionDescription.
   */
  const calculateMergedCaveat = (witnessIds: string[]): string | undefined => {
    const pathIndices = witnessIds.map((id) => languageIds.indexOf(id)).filter((i) => i >= 0);
    const pathCaveat = collectCaveatsUnion(pathIndices, adjacencyMatrix);
    
    // Get the contradicting edge (from path start to path end)
    const pathStart = witnessIds[0];
    const pathEnd = witnessIds[witnessIds.length - 1];
    const startIdx = languageIds.indexOf(pathStart);
    const endIdx = languageIds.indexOf(pathEnd);
    const contradictingEdge = adjacencyMatrix.matrix[startIdx]?.[endIdx];
    const contradictingCaveat = contradictingEdge?.caveat;
    
    // Merge all caveats
    const allCaveats = new Set<string>();
    if (pathCaveat) {
      for (const c of pathCaveat.split(' OR ')) {
        allCaveats.add(c.trim());
      }
    }
    if (contradictingCaveat) {
      allCaveats.add(contradictingCaveat);
    }
    return allCaveats.size > 0 ? Array.from(allCaveats).join(' OR ') : undefined;
  };

  const finalizeSimpleDowngrade = (
    nextStatus: string,
    triedStatus: string,
    witnessIds: string[]
  ): void => {
    const pathIndices = witnessIds.map((id) => languageIds.indexOf(id)).filter((i) => i >= 0);
    const refs = collectRefsUnion(pathIndices, adjacencyMatrix);
    
    // Calculate merged caveat from path + contradicting edge
    const caveat = calculateMergedCaveat(witnessIds);
    
    // Pass merged caveat to description builder so it appears in description text
    const newDesc = buildContradictionDescription(triedStatus, witnessIds, caveat);
    if (DEBUG_PROPAGATION) {
      console.log(`[Propagation] DOWNGRADE ${srcName} -> ${tgtName}: ${status ?? 'null'} -> ${nextStatus} (witness: ${witnessIds.map(idToName).join(' -> ')})`);
    }
    adjacencyMatrix.matrix[source][target] = {
      status: nextStatus,
      refs,
      caveat,
      hidden: false,
      derived: true,
      separatingFunctionIds: undefined,
      description: newDesc.trim()
    };
  };

  /**
   * Finalize downgrade from unknown-poly-quasi to no-poly-quasi.
   * Preserves the original quasiDescription and creates a derived noPolyDescription.
   */
  const finalizeNoPolyQuasiDowngrade = (
    witnessIds: string[]
  ): void => {
    // Extract original quasiDescription from the unknown-poly-quasi relation
    const quasiDescription = extractQuasiDescription(relation) ?? {
      description: relation?.description ?? '',
      refs: relation?.refs ?? [],
      derived: relation?.derived ?? false
    };
    
    // Calculate merged caveat first (for both the field and description text)
    // Merge caveats: original caveat + path caveats + contradicting edge caveat
    const pathIndices = witnessIds.map((id) => languageIds.indexOf(id)).filter((i) => i >= 0);
    const baseMergedCaveat = calculateMergedCaveat(witnessIds);
    const originalCaveat = relation?.caveat;
    const allCaveats = new Set<string>();
    if (originalCaveat) allCaveats.add(originalCaveat);
    if (baseMergedCaveat) {
      for (const c of baseMergedCaveat.split(' OR ')) {
        allCaveats.add(c.trim());
      }
    }
    const mergedCaveat = allCaveats.size > 0 ? Array.from(allCaveats).join(' OR ') : undefined;
    
    // Create derived noPolyDescription from contradiction (with merged caveat)
    const noPolyDesc = buildContradictionDescription('poly', witnessIds, mergedCaveat);
    const noPolyRefs = collectRefsUnion(pathIndices, adjacencyMatrix);
    const noPolyDescription: DescriptionComponent = {
      description: noPolyDesc,
      refs: noPolyRefs,
      derived: true
    };
    
    // Combine refs from both proofs
    const allRefs = [...new Set([...noPolyDescription.refs, ...quasiDescription.refs])];
    
    // derived = true only if BOTH proofs are derived
    const fullyDerived = noPolyDescription.derived && quasiDescription.derived;
    
    if (DEBUG_PROPAGATION) {
      console.log(`[Propagation] DOWNGRADE ${srcName} -> ${tgtName}: ${status ?? 'null'} -> no-poly-quasi (witness: ${witnessIds.map(idToName).join(' -> ')})`);
    }
    
    adjacencyMatrix.matrix[source][target] = {
      status: 'no-poly-quasi',
      refs: allRefs,
      caveat: mergedCaveat,
      hidden: false,
      derived: fullyDerived,
      separatingFunctionIds: relation?.separatingFunctionIds,
      noPolyDescription,
      quasiDescription,
      description: buildNoPolyQuasiDescription(noPolyDescription, quasiDescription)
    };
  };

  // Case: null / unknown-both
  if (status === null || status === 'unknown-both') {
    // Trial poly
    const polyResult = runConsistency('poly');
    if (!polyResult.ok) {
      const witnessIds = polyResult.witnessPath ?? [languageIds[source], languageIds[target]];
      finalizeSimpleDowngrade('no-poly-unknown-quasi', 'poly', witnessIds);
      return true;
    }
    // Trial quasi
    const quasiResult = runConsistency('unknown-poly-quasi');
    if (!quasiResult.ok) {
      const witnessIds = quasiResult.witnessPath ?? [languageIds[source], languageIds[target]];
      finalizeSimpleDowngrade('no-quasi', 'unknown-poly-quasi', witnessIds);
      return true;
    }
    // restore original status (either null or unknown-both)
    adjacencyMatrix.matrix[source][target] = relation ?? null;
    return false;
  }

  // Case: unknown-poly-quasi
  if (status === 'unknown-poly-quasi') {
    const polyResult = runConsistency('poly');
    if (!polyResult.ok) {
      const witnessIds = polyResult.witnessPath ?? [languageIds[source], languageIds[target]];
      // Use structured proof for no-poly-quasi
      finalizeNoPolyQuasiDowngrade(witnessIds);
      return true;
    }
    adjacencyMatrix.matrix[source][target] = relation;
    return false;
  }

  // Case: no-poly-unknown-quasi
  if (status === 'no-poly-unknown-quasi') {
    const quasiResult = runConsistency('no-poly-quasi');
    if (!quasiResult.ok) {
      const witnessIds = quasiResult.witnessPath ?? [languageIds[source], languageIds[target]];
      finalizeSimpleDowngrade('no-quasi', 'no-poly-quasi', witnessIds);
      return true;
    }
    adjacencyMatrix.matrix[source][target] = relation;
    return false;
  }

  return false;
}

/**
 * Implicit propagation pass: rebuild indices, enforce fixed-point quasi/poly upgrades (Phase 1),
 * then perform contradiction-based downgrades (Phase 2).
 */
export function propagateImplicitRelations(data: GraphData): GraphData {
  const { adjacencyMatrix } = data;
  adjacencyMatrix.indexByLanguage = rebuildIndexMap(adjacencyMatrix.languageIds);

  // Initialize the name map for id-to-name resolution
  initNameMap(data.languages);

  // Phase 0: consistency guard
  const consistencyResult = validateAdjacencyConsistency(data);
  if (!consistencyResult.ok) {
    throw new Error(consistencyResult.error ?? 'Adjacency consistency validation failed');
  }

  // Phase 1: fixed-point upgrades
  let changed = true;
  while (changed) {
    const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
    const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
    const upgrades = phaseOneUpgrade(adjacencyMatrix, reachP, reachQ);
    changed = upgrades > 0;
  }

  // Phase 2: contradiction-driven downgrades (repeat-until-stable)
  let downgraded = true;
  while (downgraded) {
    downgraded = false;
    const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
    const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
    for (let i = 0; i < adjacencyMatrix.languageIds.length; i += 1) {
      for (let j = 0; j < adjacencyMatrix.languageIds.length; j += 1) {
        if (i === j) continue;
        if (tryDowngrade(data, i, j, reachP, reachQ)) {
          downgraded = true;
        }
      }
    }
  }

  // Phase 3-5: Query propagation
  propagateQueryOperations(data);

  return data;
}

// =============================================================================
// Level 2: Query Propagation
// =============================================================================

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

function queryIsUnknown(complexity: string): boolean {
  return UNKNOWN_QUERY_STATUSES.has(complexity) || complexity === 'unknown-both' || complexity === 'unknown-to-us';
}

/**
 * Phase 3: Propagate query support via succinctness.
 * If L1 -> L2 in poly/quasi and L2 supports query q, then L1 supports q.
 */
function propagateQueriesViaSuccinctness(
  data: GraphData,
  reachP: { reach: boolean[][] },
  reachQ: { reach: boolean[][] },
  polyOnly: boolean
): boolean {
  let changed = false;
  const { adjacencyMatrix, languages } = data;
  const { languageIds } = adjacencyMatrix;
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
              
              if (DEBUG_PROPAGATION) {
                console.log(`[Query Propagation] UPGRADE ${l1Name}.${queryCode}: ${l1Complexity} -> poly`);
              }
              
              setQuerySupport(l1, queryCode, {
                complexity: 'poly',
                refs: l2.properties?.queries?.[queryCode]?.refs ?? [],
                derived: true,
                description
              });
              changed = true;
            }
          }
        }
      }

      // Check quasi upgrades
      if (!polyOnly && queryGuaranteesQuasi(l2Complexity)) {
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
            
            if (DEBUG_PROPAGATION) {
              console.log(`[Query Propagation] UPGRADE ${l1Name}.${queryCode}: ${l1Complexity} -> ${newComplexity}`);
            }
            
            setQuerySupport(l1, queryCode, {
              complexity: newComplexity,
              refs: l2.properties?.queries?.[queryCode]?.refs ?? [],
              derived: true,
              description
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
function propagateQueriesViaLemmas(
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

      for (const antecedentOp of lemma.antecedent) {
        const support = getOperationSupport(language, antecedentOp);
        if (!support) {
          allSupported = false;
          break;
        }

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
        const description = `By lemma ${lemma.id}: since ${langName} supports {${antecedentNames}}, it supports ${lemma.consequent}. ${lemma.description}`;

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
            description
          });
        } else {
          // Transformation consequent
          if (!language.properties) language.properties = {};
          if (!language.properties.transformations) language.properties.transformations = {};
          language.properties.transformations[lemma.consequent] = {
            complexity: targetComplexity,
            refs: lemma.refs,
            derived: true,
            description
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
function propagateQueryDowngrades(
  data: GraphData,
  reachP: { reach: boolean[][] },
  reachQ: { reach: boolean[][] }
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

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] DOWNGRADE ${l2Name}.${queryCode}: ${l2Complexity} -> no-poly-unknown-quasi`);
          }

          setQuerySupport(l2, queryCode, {
            complexity: 'no-poly-unknown-quasi',
            refs: l1.properties?.queries?.[queryCode]?.refs ?? [],
            derived: true,
            description
          });
          changed = true;
        }
      }

      // No-quasi propagation: L1 has no-quasi, propagate via quasi edges
      if (queryAssertsNoQuasi(l1Complexity)) {
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

          if (DEBUG_PROPAGATION) {
            console.log(`[Query Propagation] DOWNGRADE ${l2Name}.${queryCode}: ${l2Complexity} -> no-quasi`);
          }

          setQuerySupport(l2, queryCode, {
            complexity: 'no-quasi',
            refs: l1.properties?.queries?.[queryCode]?.refs ?? [],
            derived: true,
            description
          });
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

/**
 * Main query propagation function.
 * Runs phases 3-5 of Level 2 propagation.
 */
function propagateQueryOperations(data: GraphData): void {
  const { adjacencyMatrix } = data;

  // Phase 3+4: Fixed-point upgrades (poly first, then quasi)
  let polyChanged = true;
  while (polyChanged) {
    const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
    const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
    polyChanged = false;
    if (propagateQueriesViaSuccinctness(data, reachP, reachQ, true)) {
      polyChanged = true;
    }
    if (propagateQueriesViaLemmas(data, OPERATION_LEMMAS, true)) {
      polyChanged = true;
    }
  }

  let quasiChanged = true;
  while (quasiChanged) {
    const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
    const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
    quasiChanged = false;
    if (propagateQueriesViaSuccinctness(data, reachP, reachQ, false)) {
      quasiChanged = true;
    }
    if (propagateQueriesViaLemmas(data, OPERATION_LEMMAS, false)) {
      quasiChanged = true;
    }
  }

  // Phase 5: Downgrades
  let downgradeChanged = true;
  while (downgradeChanged) {
    const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
    const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);
    downgradeChanged = propagateQueryDowngrades(data, reachP, reachQ);
  }

  // Post-propagation validation: ensure no contradictions remain
  const consistency = validateQueryConsistency(data);
  if (!consistency.ok) {
    throw new Error(consistency.error ?? 'Query consistency validation failed after propagation');
  }
}
