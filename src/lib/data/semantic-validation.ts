import type { GraphData, KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../types.js';

export interface SemanticValidationResult {
  ok: boolean;
  /** If not ok, a formatted description of the contradiction */
  error?: string;
  /** The witness path as language IDs (for programmatic use) */
  witnessPath?: string[];
}

const POLY_STATUS = new Set<string>(['poly']);
const QUASI_STATUS = new Set<string>(['poly', 'unknown-poly-quasi', 'no-poly-quasi']);
const NO_POLY_STATUSES = new Set<string>(['no-poly-unknown-quasi', 'no-poly-quasi', 'no-quasi']);

function getEdgeStatus(matrix: KCAdjacencyMatrix, source: number, target: number): string | null {
  const relation = matrix.matrix[source]?.[target];
  return relation ? relation.status : null;
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

interface Reachability {
  reach: boolean[][];
  parent: number[][];
}

function initMatrix(size: number, fill: boolean): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(fill));
}

function initParent(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(-1));
}

function computeReachability(matrix: KCAdjacencyMatrix, allowed: Set<string>): Reachability {
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

function pathToIds(path: number[], ids: string[]): string[] {
  return path.map((idx) => ids[idx]);
}

function describePath(path: number[], matrix: KCAdjacencyMatrix): string {
  const { languageIds } = matrix;
  const parts: string[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    const status = getEdgeStatus(matrix, from, to) ?? 'unknown';
    const phrase = phraseForStatus(status);
    parts.push(`${languageIds[from]} transforms to ${languageIds[to]} ${phrase}.`);
  }
  return parts.join(' ');
}

function formatStoredStatus(status: string | null): string {
  return status ?? 'missing';
}

function buildContradictionMessage(
  source: number,
  target: number,
  kind: 'poly' | 'quasi',
  path: number[],
  matrix: KCAdjacencyMatrix
): string {
  const base = describePath(path, matrix);
  const fromId = matrix.languageIds[source];
  const toId = matrix.languageIds[target];
  const storedStatus = formatStoredStatus(getEdgeStatus(matrix, source, target));
  const mustHave = kind === 'poly' ? 'poly' : 'quasi';
  return `Contradiction: ${base} Therefore ${fromId}→${toId} must have ${mustHave}, but ${fromId}→${toId} is marked ${storedStatus}.`;
}

function buildClosureMessage(
  source: number,
  target: number,
  kind: 'poly' | 'quasi',
  path: number[],
  matrix: KCAdjacencyMatrix
): string {
  const base = describePath(path, matrix);
  const fromId = matrix.languageIds[source];
  const toId = matrix.languageIds[target];
  const storedStatus = formatStoredStatus(getEdgeStatus(matrix, source, target));
  const mustHave = kind === 'poly' ? 'poly' : 'at least quasi';
  return `Closure violation: ${base} Therefore ${fromId}→${toId} must be ${mustHave}, but ${fromId}→${toId} is marked ${storedStatus}.`;
}

export function validateAdjacencyConsistency(data: GraphData): SemanticValidationResult {
  const { adjacencyMatrix } = data;
  const size = adjacencyMatrix.languageIds.length;
  const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
  const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      if (i === j) continue;
      const status = getEdgeStatus(adjacencyMatrix, i, j);
      if (reachP.reach[i][j] && status && NO_POLY_STATUSES.has(status)) {
        const path = reconstructPathIndices(i, j, reachP.parent[i]);
        const message = buildContradictionMessage(i, j, 'poly', path, adjacencyMatrix);
        return { ok: false, error: message, witnessPath: pathToIds(path, adjacencyMatrix.languageIds) };
      }
      if (reachQ.reach[i][j] && status === 'no-quasi') {
        const path = reconstructPathIndices(i, j, reachQ.parent[i]);
        const message = buildContradictionMessage(i, j, 'quasi', path, adjacencyMatrix);
        return { ok: false, error: message, witnessPath: pathToIds(path, adjacencyMatrix.languageIds) };
      }
    }
  }

  return { ok: true };
}

export function validateAdjacencyClosure(data: GraphData): SemanticValidationResult {
  const { adjacencyMatrix } = data;
  const size = adjacencyMatrix.languageIds.length;
  const reachP = computeReachability(adjacencyMatrix, POLY_STATUS);
  const reachQ = computeReachability(adjacencyMatrix, QUASI_STATUS);

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      if (i === j) continue;
      const status = getEdgeStatus(adjacencyMatrix, i, j);
      if (reachP.reach[i][j]) {
        if (status !== 'poly') {
          const path = reconstructPathIndices(i, j, reachP.parent[i]);
          const message = buildClosureMessage(i, j, 'poly', path, adjacencyMatrix);
          return { ok: false, error: message, witnessPath: pathToIds(path, adjacencyMatrix.languageIds) };
        }
      } else if (reachQ.reach[i][j]) {
        if (!status || !QUASI_STATUS.has(status)) {
          const path = reconstructPathIndices(i, j, reachQ.parent[i]);
          const message = buildClosureMessage(i, j, 'quasi', path, adjacencyMatrix);
          return { ok: false, error: message, witnessPath: pathToIds(path, adjacencyMatrix.languageIds) };
        }
      }
    }
  }

  return { ok: true };
}

export function guaranteesPoly(status: string | null | undefined): boolean {
  return status !== undefined && status !== null && POLY_STATUS.has(status);
}

export function guaranteesQuasi(status: string | null | undefined): boolean {
  return status !== undefined && status !== null && QUASI_STATUS.has(status);
}

export function collectRefsUnion(path: number[], matrix: KCAdjacencyMatrix): string[] {
  const refs = new Set<string>();
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    const relation = matrix.matrix[from]?.[to];
    if (!relation?.refs) continue;
    for (const ref of relation.refs) {
      refs.add(ref);
    }
  }
  return Array.from(refs);
}

export function pathDescription(pathIds: string[], matrix: KCAdjacencyMatrix): string {
  const { languageIds } = matrix;
  const parts: string[] = [];
  for (let i = 0; i < pathIds.length - 1; i += 1) {
    const fromId = pathIds[i];
    const toId = pathIds[i + 1];
    const fromIdx = languageIds.indexOf(fromId);
    const toIdx = languageIds.indexOf(toId);
    const status = getEdgeStatus(matrix, fromIdx, toIdx) ?? 'unknown';
    parts.push(`${fromId} transforms to ${toId} ${phraseForStatus(status)}.`);
  }
  return parts.join(' ');
}

export function reconstructPathIds(source: number, target: number, parent: number[][], ids: string[]): string[] {
  const path = reconstructPathIndices(source, target, parent[source]);
  return pathToIds(path, ids);
}
