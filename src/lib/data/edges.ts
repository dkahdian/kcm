import type { KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../types.js';
import database from './database.json';

const adjacency = database.adjacencyMatrix as {
  languageIds: string[];
  matrix: (DirectedSuccinctnessRelation | null)[][];
};

const languageIds = adjacency.languageIds;
const matrix = adjacency.matrix;

const indexByLanguage: Record<string, number> = Object.fromEntries(
  languageIds.map((name, idx) => [name, idx])
);

export function indexForLanguage(name: string): number | undefined {
  return indexByLanguage[name];
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
