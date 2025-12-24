import type { GraphData, KCSeparatingFunction } from '../types.js';
import database from './database.json';
import { allLanguages } from './languages.js';
import { adjacencyMatrixData } from './edges.js';
import { relationTypes } from './complexities.js';
import { allReferences } from './references.js';
import { COMPLEXITIES } from './complexities.js';

const separatingFunctions = (database.separatingFunctions ?? []) as KCSeparatingFunction[];
const metadata = ('metadata' in database
  ? (database as { metadata?: Record<string, unknown> }).metadata
  : undefined);

export const canonicalDataset: GraphData = {
  languages: allLanguages,
  adjacencyMatrix: adjacencyMatrixData,
  relationTypes,
  complexities: COMPLEXITIES,
  references: allReferences,
  separatingFunctions,
  metadata
};
