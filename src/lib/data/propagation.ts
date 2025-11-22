import type { CanonicalKCData, DirectedSuccinctnessRelation, KCAdjacencyMatrix } from '../types.js';

const DERIVED_RELATION_NOTE = 'Derived via polynomial transitive closure';

function rebuildIndexMap(languageIds: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  languageIds.forEach((id, idx) => {
    index[id] = idx;
  });
  return index;
}

function computePolyReachability(matrix: KCAdjacencyMatrix): boolean[][] {
  const { languageIds, matrix: relations } = matrix;
  const size = languageIds.length;
  const reachable: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  for (let source = 0; source < size; source += 1) {
    const queue: number[] = [source];
    const visited = new Set<number>([source]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const row = relations[current];
      if (!row) continue;

      for (let target = 0; target < row.length; target += 1) {
        if (target === source) continue;
        const relation = row[target];
        if (!relation || relation.status !== 'poly') continue;

        if (!reachable[source][target]) {
          reachable[source][target] = true;
        }

        if (!visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      }
    }
  }

  return reachable;
}

function createDerivedRelation(): DirectedSuccinctnessRelation {
  return {
    status: 'poly',
    refs: [],
    hidden: true,
    description: DERIVED_RELATION_NOTE
  };
}

function addDerivedPolyEdges(matrix: KCAdjacencyMatrix, reachable: boolean[][]): number {
  const { languageIds, matrix: relations } = matrix;
  let inserted = 0;

  for (let i = 0; i < languageIds.length; i += 1) {
    for (let j = 0; j < languageIds.length; j += 1) {
      if (i === j || !reachable[i][j]) continue;
      if (relations[i][j]) continue;
      relations[i][j] = createDerivedRelation();
      inserted += 1;
    }
  }

  return inserted;
}

/**
 * Implicit propagation pass that (1) rebuilds adjacency indices and
 * (2) ensures polynomial relationships are closed under transitivity.
 */
export function propagateImplicitRelations(data: CanonicalKCData): CanonicalKCData {
  const { adjacencyMatrix } = data;
  adjacencyMatrix.indexByLanguage = rebuildIndexMap(adjacencyMatrix.languageIds);

  const reachable = computePolyReachability(adjacencyMatrix);
  addDerivedPolyEdges(adjacencyMatrix, reachable);
  return data;
}
