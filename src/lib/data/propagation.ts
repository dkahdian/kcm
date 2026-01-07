import type { GraphData, DirectedSuccinctnessRelation, KCAdjacencyMatrix, DescriptionComponent } from '../types.js';
import {
  validateAdjacencyConsistency,
  guaranteesPoly,
  guaranteesQuasi,
  collectRefsUnion
} from './validation/semantic.js';
import { initNameMap, idToName } from '../utils/language-id.js';

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

  return data;
}
