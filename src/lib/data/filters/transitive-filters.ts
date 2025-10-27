import type { LanguageFilter, KCLanguage, TransformationStatus } from '../../types.js';
import { adjacencyMatrixData } from '../edges.js';

/**
 * Helper function to check if a status is poly or quasi
 */
function isPolyOrQuasi(status: TransformationStatus): 'poly' | 'quasi' | null {
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
  lambda: (language: KCLanguage, param: boolean) => {
    const matrix = adjacencyMatrixData;
    const nodeIndex = matrix.indexByLanguage[language.id];
    if (nodeIndex === undefined) return language;

    const row = matrix.matrix[nodeIndex];
    if (!row) return language;

    // If filter is disabled, unhide all edges from this node
    if (!param) {
      row.forEach((relation) => {
        if (relation) {
          relation.hidden = false;
        }
      });
      return language;
    }

    // Filter is enabled - mark transitive edges as hidden
    // Get all direct edges from this node
    const directEdges: Array<{targetIndex: number, edgeType: 'poly' | 'quasi'}> = [];
    row.forEach((relation, targetIndex) => {
      if (!relation || targetIndex === nodeIndex) return;
      const edgeType = isPolyOrQuasi(relation.status);
      if (edgeType) {
        directEdges.push({ targetIndex, edgeType });
      }
    });

    // For each direct edge, check if it's transitive
    for (const {targetIndex, edgeType} of directEdges) {
      const edge = matrix.matrix[nodeIndex][targetIndex];
      if (!edge) continue;

      // Temporarily hide this edge
      edge.hidden = true;

      // Check if target is still reachable via BFS
      const isStillReachable = canReach(nodeIndex, targetIndex, edgeType);

      // If still reachable, edge is transitive - keep it hidden
      // If not reachable, edge is needed - unhide it
      if (!isStillReachable) {
        edge.hidden = false;
      }
    }

    return language;
  }
};

/**
 * Check if targetIndex is reachable from sourceIndex via BFS
 * @param sourceIndex - Starting node
 * @param targetIndex - Target node to reach
 * @param edgeType - Type of edge we're checking ('poly' or 'quasi')
 */
function canReach(
  sourceIndex: number,
  targetIndex: number,
  edgeType: 'poly' | 'quasi'
): boolean {
  const matrix = adjacencyMatrixData;
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
