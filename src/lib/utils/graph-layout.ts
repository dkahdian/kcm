/**
 * Pure graph-theory utility functions for KCGraph layout.
 * No Cytoscape or Svelte dependencies — only operates on adjacency matrix types.
 */
import type { KCAdjacencyMatrix, DirectedSuccinctnessRelation, KCLanguage } from '../types.js';

export interface EdgePair {
  id: string;
  nodeA: string;
  nodeB: string;
  aToB: string | null;
  bToA: string | null;
  refs: string[];
  description: string;
  forward: DirectedSuccinctnessRelation | null;
  backward: DirectedSuccinctnessRelation | null;
}

/**
 * Normalize directed edges into undirected EdgePairs,
 * combining (A→B) and (B→A) into a single pair with canonical ordering.
 */
export function normalizeEdgePairs(adjacencyMatrix: KCAdjacencyMatrix): EdgePair[] {
  const pairMap = new Map<string, EdgePair>();
  const { languageIds, matrix } = adjacencyMatrix;

  for (let i = 0; i < languageIds.length; i += 1) {
    for (let j = 0; j < languageIds.length; j += 1) {
      const relation = matrix[i]?.[j];
      if (!relation) continue;

      const source = languageIds[i];
      const target = languageIds[j];
      const [nodeA, nodeB] = source < target ? [source, target] : [target, source];
      const key = `${nodeA}__${nodeB}`;

      let pair = pairMap.get(key);
      if (!pair) {
        pair = {
          id: `${nodeA}-${nodeB}`,
          nodeA,
          nodeB,
          aToB: null,
          bToA: null,
          refs: [],
          description: '',
          forward: null,
          backward: null
        };
        pairMap.set(key, pair);
      }

      if (source === nodeA) {
        pair.aToB = relation.status;
        pair.forward = relation;
      } else {
        pair.bToA = relation.status;
        pair.backward = relation;
      }

      const combinedRefs = new Set(pair.refs);
      for (const ref of relation.refs) {
        combinedRefs.add(ref);
      }
      pair.refs = Array.from(combinedRefs);
    }
  }

  for (const pair of pairMap.values()) {
    const descriptions: string[] = [];
    if (pair.forward?.description) {
      descriptions.push(pair.forward.description);
    }
    const backwardDesc = pair.backward?.description;
    if (backwardDesc && backwardDesc !== pair.forward?.description) {
      descriptions.push(backwardDesc);
    }
    pair.description = descriptions.join(' ').trim();
  }

  return Array.from(pairMap.values());
}

/**
 * Build same-layer groups using union-find.
 * Nodes connected by bidirectional poly edges are placed in the same group (same dagre rank).
 * Returns a map from each node to its group representative.
 */
export function buildSameLayerGroups(edges: EdgePair[], languages: KCLanguage[]): Map<string, string> {
  const languageIds = new Set(languages.map(l => l.id));
  const parent = new Map<string, string>();
  
  const findRoot = (node: string): string => {
    if (parent.get(node) === node) return node;
    const root = findRoot(parent.get(node)!);
    parent.set(node, root);
    return root;
  };
  
  const union = (a: string, b: string) => {
    const rootA = findRoot(a);
    const rootB = findRoot(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };
  
  // Initialize
  for (const lang of languages) {
    parent.set(lang.id, lang.id);
  }
  
  // Union nodes with bidirectional poly edges
  for (const edge of edges) {
    if (!languageIds.has(edge.nodeA) || !languageIds.has(edge.nodeB)) continue;
    if (edge.aToB === 'poly' && edge.bToA === 'poly') {
      union(edge.nodeA, edge.nodeB);
    }
  }
  
  // Return map: nodeId -> groupRepresentative
  const nodeToGroup = new Map<string, string>();
  for (const lang of languages) {
    nodeToGroup.set(lang.id, findRoot(lang.id));
  }
  
  return nodeToGroup;
}
