import type { KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../types.js';
import edgesData from './json/edges.json';

const languageIds = edgesData.languageIds;
const matrix = edgesData.matrix as (DirectedSuccinctnessRelation | null)[][];

const indexByLanguage: Record<string, number> = Object.fromEntries(
  languageIds.map((id, idx) => [id, idx])
);

export function indexForLanguage(id: string): number | undefined {
  return indexByLanguage[id];
}

export function languageForIndex(index: number): string | undefined {
  return languageIds[index];
}

export const adjacencyMatrixData: KCAdjacencyMatrix = {
  languageIds,
  indexByLanguage,
  matrix
};

// Temporary export for contribution system (to be replaced)
export const edges: any[] = [];
