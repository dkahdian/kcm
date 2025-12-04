import type { CanonicalKCData, KCSeparatingFunction } from '../types.js';
import database from './database.json';
import { allLanguages } from './languages.js';
import { adjacencyMatrixData } from './edges.js';
import { relationTypes } from './relation-types.js';
import { allReferences } from './references.js';

const separatingFunctions = (database.separatingFunctions ?? []) as KCSeparatingFunction[];
const metadata = ('metadata' in database
  ? (database as { metadata?: Record<string, unknown> }).metadata
  : undefined);

export const canonicalDataset: CanonicalKCData = {
  languages: allLanguages,
  adjacencyMatrix: adjacencyMatrixData,
  relationTypes,
  references: allReferences,
  separatingFunctions,
  metadata
};
