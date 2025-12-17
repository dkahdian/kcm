import type { LanguageFilter, GraphData, KCAdjacencyMatrix } from '../../types.js';
import { cloneDataset } from '../transforms.js';

/**
 * Helper function to check if a status is poly or quasi
 */
function isPolyOrQuasi(status: string): 'poly' | 'quasi' | null {
  if (status === 'poly') return 'poly';
  if (status === 'no-poly-quasi' || status === 'unknown-poly-quasi') return 'quasi';
  return null;
}

/**
 * Omit transitive edges - ON BY DEFAULT
 * 
 * For each node N, marks edges as hidden if they are redundant due to transitivity.
 * Uses MST approach: builds two minimum spanning trees (poly-only, poly+quasi).
 * 
 * Algorithm:
 * - When enabled (param=true): marks transitive edges as hidden
 * - When disabled (param=false): unhides all edges
 * - For each direct edge from N→B:
 *   - Temporarily hide it
 *   - Check if B is still reachable via BFS
 *   - If yes: edge is transitive, keep hidden
 *   - If no: edge is needed, unhide it
 */
export const omitTransitiveEdges: LanguageFilter<boolean> = {
  id: 'omit-transitive-edges',
  name: 'Omit Transitive Edges',
  description: 'Hide edges that are redundant due to transitivity',
  category: 'Edge Visibility',
  defaultParam: true, // ON BY DEFAULT
  controlType: 'checkbox',
  lambda: (data: GraphData, param: boolean) => {
    const working = cloneDataset(data);
    const { adjacencyMatrix } = working;

    for (let nodeIndex = 0; nodeIndex < adjacencyMatrix.languageIds.length; nodeIndex += 1) {
      const row = adjacencyMatrix.matrix[nodeIndex];
      if (!row) continue;

      if (!param) {
        row.forEach((relation) => {
          if (relation) {
            relation.hidden = false;
          }
        });
        continue;
      }

      const directEdges: Array<{ targetIndex: number; edgeType: 'poly' | 'quasi' }> = [];
      row.forEach((relation, targetIndex) => {
        if (!relation || targetIndex === nodeIndex) return;
        const edgeType = isPolyOrQuasi(relation.status);
        if (edgeType) {
          directEdges.push({ targetIndex, edgeType });
        }
      });

      for (const { targetIndex, edgeType } of directEdges) {
        const edge = adjacencyMatrix.matrix[nodeIndex][targetIndex];
        if (!edge) continue;

        const previousHidden = edge.hidden ?? false;
        edge.hidden = true;
        const reachable = canReach(adjacencyMatrix, nodeIndex, targetIndex, edgeType);
        if (!reachable) {
          edge.hidden = previousHidden;
        }
      }
    }

    return working;
  }
};

/**
 * Check if targetIndex is reachable from sourceIndex via BFS
 * @param sourceIndex - Starting node
 * @param targetIndex - Target node to reach
 * @param edgeType - Type of edge we're checking ('poly' or 'quasi')
 */
function canReach(
  matrix: KCAdjacencyMatrix,
  sourceIndex: number,
  targetIndex: number,
  edgeType: 'poly' | 'quasi'
): boolean {
  const visited = new Set<number>();
  const queue: number[] = [sourceIndex];
  visited.add(sourceIndex);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    const currentRow = matrix.matrix[current];
    if (!currentRow) continue;

    for (let i = 0; i < currentRow.length; i++) {
      const relation = currentRow[i];
      if (!relation || i === sourceIndex || visited.has(i)) continue;

      // Skip hidden edges
      if (relation.hidden) continue;

      const currentEdgeType = isPolyOrQuasi(relation.status);
      if (!currentEdgeType) continue;

      // For poly edges, we can only use poly edges
      // For quasi edges, we can use both poly and quasi
      const canUse = edgeType === 'poly' 
        ? currentEdgeType === 'poly'
        : (currentEdgeType === 'poly' || currentEdgeType === 'quasi');

      if (canUse) {
        if (i === targetIndex) {
          return true; // Found a path!
        }
        visited.add(i);
        queue.push(i);
      }
    }
  }

  return false; // No path found
}

export const transitiveFilters: LanguageFilter<boolean>[] = [
  omitTransitiveEdges
];
