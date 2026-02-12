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

export const adjacencyMatrixData: KCAdjacencyMatrix = {
  languageIds,
  indexByLanguage,
  matrix
};
