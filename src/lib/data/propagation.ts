import type { GraphData, DirectedSuccinctnessRelation, KCAdjacencyMatrix } from '../types.js';
import {
  validateAdjacencyConsistency,
  guaranteesPoly,
  guaranteesQuasi,
  collectRefsUnion
} from './semantic-validation.js';
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

function describePath(pathIds: string[], matrix: KCAdjacencyMatrix): string {
  const { languageIds } = matrix;
  const parts: string[] = [];
  for (let i = 0; i < pathIds.length - 1; i += 1) {
    const fromId = pathIds[i];
    const toId = pathIds[i + 1];
    const fromIdx = languageIds.indexOf(fromId);
    const toIdx = languageIds.indexOf(toId);
    const status = matrix.matrix[fromIdx]?.[toIdx]?.status ?? 'unknown';
    parts.push(`${idToName(fromId)} transforms to ${idToName(toId)} ${phraseForStatus(status)}.`);
  }
  return parts.join(' ');
}

function applyUpgrade(
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
  const pathIds = path.map((idx) => languageIds[idx]);
  const implicitIntro = 'This is an implicit relationship.';
  const pathDesc = describePath(pathIds, matrix);
  const description = `${implicitIntro} ${pathDesc} ${derivedDescription}`.trim();
  matrix.matrix[source][target] = {
    status: newStatus,
    refs,
    separatingFunctionIds: undefined,
    hidden: false,
    derived: true,
    description
  } satisfies DirectedSuccinctnessRelation;
}

function formatMissingOrStatus(status: string | null): string {
  return status ?? 'missing';
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
            `Contradiction: ${desc} Therefore ${srcName}→${tgtName} must have quasi, but is marked no-quasi.`
          );
        }
        const path = ensurePath(reconstructPathIndices(i, j, reachQ.parent[i]), i, j);
        const derivedDesc = `Therefore a quasi-polynomial transformation exists from ${srcName} to ${tgtName}.`;
        const newStatus = status === 'no-poly-unknown-quasi' ? 'no-poly-quasi' : 'unknown-poly-quasi';
        if (DEBUG_PROPAGATION) {
          console.log(`[Propagation] UPGRADE ${srcName}→${tgtName}: ${status ?? 'null'} → ${newStatus}`);
        }
        applyUpgrade(matrix, path, newStatus, derivedDesc);
        changes += 1;
        continue; // allow re-evaluation in next fixed-point iteration
      }

      // Poly upgrades
      if (reachP.reach[i][j] && !guaranteesPoly(status)) {
        if (status === 'no-poly-quasi' || status === 'no-poly-unknown-quasi' || status === 'no-quasi') {
          const path = ensurePath(reconstructPathIndices(i, j, reachP.parent[i]), i, j);
          const ids = path.map((idx) => languageIds[idx]);
          const desc = describePath(ids, matrix);
          const marked = formatMissingOrStatus(status);
          contradictionError(
            `Contradiction: ${desc} Therefore ${srcName}→${tgtName} must have poly, but is marked ${marked}.`
          );
        }
        const path = ensurePath(reconstructPathIndices(i, j, reachP.parent[i]), i, j);
        const derivedDesc = `Therefore a polynomial transformation exists from ${srcName} to ${tgtName}.`;
        if (DEBUG_PROPAGATION) {
          console.log(`[Propagation] UPGRADE ${srcName}→${tgtName}: ${status ?? 'null'} → poly`);
        }
        applyUpgrade(matrix, path, 'poly', derivedDesc);
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

  const runConsistency = (nextStatus: string): boolean => {
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
    const ok = result.ok;
    // always restore the original relation after the trial
    adjacencyMatrix.matrix[source][target] = original ?? null;
    return ok;
  };

  const finalizeDowngrade = (nextStatus: string, witnessPath: number[], descriptionSuffix: string): void => {
    if (witnessPath.length === 0) {
      witnessPath = [source, target];
    }
    const refs = collectRefsUnion(witnessPath, adjacencyMatrix);
    const ids = witnessPath.map((idx) => languageIds[idx]);
    const desc = describePath(ids, adjacencyMatrix);
    if (DEBUG_PROPAGATION) {
      console.log(`[Propagation] DOWNGRADE ${srcName}→${tgtName}: ${status ?? 'null'} → ${nextStatus}`);
    }
    adjacencyMatrix.matrix[source][target] = {
      status: nextStatus,
      refs,
      hidden: false,
      derived: true,
      separatingFunctionIds: undefined,
      description: `This is an implicit relationship. ${desc} ${descriptionSuffix}`.trim()
    };
  };

  // Case: null / unknown-both
  if (status === null || status === 'unknown-both') {
    // Trial poly
    if (!runConsistency('poly')) {
      const path = ensurePath(
        reachP.reach[source][target]
          ? reconstructPathIndices(source, target, reachP.parent[source])
          : reconstructPathIndices(source, target, reachQ.parent[source]),
        source,
        target
      );
      finalizeDowngrade('no-poly-unknown-quasi', path, `Therefore ${srcName}→${tgtName} is not poly.`);
      return true;
    }
    // Trial quasi
    if (!runConsistency('unknown-poly-quasi')) {
      const path = ensurePath(
        reachQ.reach[source][target]
          ? reconstructPathIndices(source, target, reachQ.parent[source])
          : reconstructPathIndices(source, target, reachP.parent[source]),
        source,
        target
      );
      finalizeDowngrade('no-quasi', path, `Therefore ${srcName}→${tgtName} cannot be quasi.`);
      return true;
    }
    // restore original status (either null or unknown-both)
    adjacencyMatrix.matrix[source][target] = relation ?? null;
    return false;
  }

  // Case: unknown-poly-quasi
  if (status === 'unknown-poly-quasi') {
    if (!runConsistency('poly')) {
      const path = ensurePath(
        reachP.reach[source][target]
          ? reconstructPathIndices(source, target, reachP.parent[source])
          : reconstructPathIndices(source, target, reachQ.parent[source]),
        source,
        target
      );
      finalizeDowngrade('no-poly-quasi', path, `Therefore ${srcName}→${tgtName} is not poly.`);
      return true;
    }
    adjacencyMatrix.matrix[source][target] = relation;
    return false;
  }

  // Case: no-poly-unknown-quasi
  if (status === 'no-poly-unknown-quasi') {
    if (!runConsistency('no-poly-quasi')) {
      const path = ensurePath(
        reachQ.reach[source][target]
          ? reconstructPathIndices(source, target, reachQ.parent[source])
          : reconstructPathIndices(source, target, reachP.parent[source]),
        source,
        target
      );
      finalizeDowngrade('no-quasi', path, `Therefore ${srcName}→${tgtName} cannot be quasi.`);
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
