// Shared database I/O utilities for CLI scripts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { KCAdjacencyMatrix, KCLanguage, KCReference, KCSeparatingFunction } from '../../src/lib/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATABASE_PATH = path.join(__dirname, '..', '..', 'src', 'lib', 'data', 'database.json');

export interface DatabaseSchema {
  languages: KCLanguage[];
  adjacencyMatrix: KCAdjacencyMatrix;
  references: KCReference[];
  separatingFunctions: KCSeparatingFunction[];
  tags?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  operations: Record<string, unknown>;
  operationLemmas?: unknown[];
}

export function loadDatabase(): DatabaseSchema {
  const content = fs.readFileSync(DATABASE_PATH, 'utf-8');
  return JSON.parse(content) as DatabaseSchema;
}

export function saveDatabase(database: DatabaseSchema): void {
  // Strip empty string caveats (should be undefined, not "")
  for (const lang of database.languages) {
    if (lang.properties?.queries) {
      for (const op of Object.values(lang.properties.queries)) {
        if (op && 'caveat' in op && !op.caveat) delete op.caveat;
      }
    }
    if (lang.properties?.transformations) {
      for (const op of Object.values(lang.properties.transformations)) {
        if (op && 'caveat' in op && !op.caveat) delete op.caveat;
      }
    }
  }
  if (database.adjacencyMatrix?.matrix) {
    for (const row of database.adjacencyMatrix.matrix) {
      if (!row) continue;
      for (const cell of row) {
        if (cell && 'caveat' in cell && !cell.caveat) delete cell.caveat;
      }
    }
  }
  const content = JSON.stringify(database, null, 2);
  fs.writeFileSync(DATABASE_PATH, content, 'utf-8');
}
