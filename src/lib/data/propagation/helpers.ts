import type { KCAdjacencyMatrix, DescriptionComponent } from '../../types.js';
import { idToName } from '../../utils/language-id.js';

// Debug flag - set to true to see propagation decisions in console
export const DEBUG_PROPAGATION = false;

export const POLY_STATUS = new Set<string>(['poly']);
export const QUASI_STATUS = new Set<string>(['poly', 'unknown-poly-quasi', 'no-poly-quasi']);

export function rebuildIndexMap(languageIds: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  languageIds.forEach((id, idx) => {
    index[id] = idx;
  });
  return index;
}

export function initMatrix(size: number, fill: boolean): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(fill));
}

export function initParent(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(-1));
}

export function computeReachability(matrix: KCAdjacencyMatrix, allowed: Set<string>): { reach: boolean[][]; parent: number[][] } {
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

export function reconstructPathIndices(source: number, target: number, parentRow: number[]): number[] {
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

export function ensurePath(path: number[], source: number, target: number): number[] {
  if (path.length >= 2) return path;
  return [source, target];
}

export function phraseForStatus(status: string): string {
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
export function formatStatusContradiction(srcName: string, tgtName: string, status: string): string {
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
export function formatCitations(refs: string[]): string {
  if (!refs || refs.length === 0) return '';
  return ` \\citet{${refs.join(',')}}`;
}

/**
 * Format a caveat as an "unless" clause.
 * Returns " unless {caveat}" or empty string if no caveat.
 */
export function formatCaveat(caveat: string | undefined): string {
  if (!caveat) return '';
  return ` unless ${caveat}`;
}

/**
 * Collect and merge caveats from all edges along a path.
 * Returns undefined if no caveats, a single caveat if only one,
 * or caveats joined with " OR " if multiple unique caveats.
 */
export function collectCaveatsUnion(path: number[], matrix: KCAdjacencyMatrix): string | undefined {
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

export function describePath(pathIds: string[], matrix: KCAdjacencyMatrix): string {
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
export function buildNoPolyQuasiDescription(noPolyDescription: DescriptionComponent, quasiDescription: DescriptionComponent): string {
  const parts: string[] = [];
  parts.push('First, we show no polynomial transformation exists.');
  parts.push(noPolyDescription.description);
  parts.push('');
  parts.push('Now, we show a quasipolynomial transformation exists.');
  parts.push(quasiDescription.description);
  return parts.join('\n');
}

export function contradictionError(message: string): never {
  throw new Error(message);
}
