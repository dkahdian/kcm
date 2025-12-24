/**
 * Script to refresh derived edges in database.json
 * 
 * This script:
 * 1. Reads database.json
 * 2. Removes all edges marked as "derived: true"
 * 3. Runs the propagator to re-generate derived edges
 * 4. Writes the updated database.json
 * 
 * Usage: npx tsx scripts/refresh-derived.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to database.json relative to scripts directory
const DATABASE_PATH = path.join(__dirname, '..', 'src', 'lib', 'data', 'database.json');

// Import the propagation logic
// Note: We need to dynamically import since it uses browser APIs
import { propagateImplicitRelations } from '../src/lib/data/propagation.js';
import type { GraphData, DirectedSuccinctnessRelation, KCAdjacencyMatrix } from '../src/lib/types.js';

interface DatabaseSchema {
  languages: any[];
  references: any[];
  separatingFunctions: any[];
  complexities: any[];
  tags: any[];
  adjacencyMatrix: KCAdjacencyMatrix;
}

function loadDatabase(): DatabaseSchema {
  const content = fs.readFileSync(DATABASE_PATH, 'utf-8');
  return JSON.parse(content) as DatabaseSchema;
}

function saveDatabase(data: DatabaseSchema): void {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(DATABASE_PATH, content, 'utf-8');
}

function removeDerivedEdges(matrix: KCAdjacencyMatrix): { removed: number } {
  let removed = 0;
  const size = matrix.languageIds.length;
  
  for (let i = 0; i < size; i++) {
    if (!matrix.matrix[i]) continue;
    for (let j = 0; j < size; j++) {
      const edge = matrix.matrix[i][j] as DirectedSuccinctnessRelation | null;
      if (edge && edge.derived === true) {
        matrix.matrix[i][j] = null;
        removed++;
      }
    }
  }
  
  return { removed };
}

function countDerivedEdges(matrix: KCAdjacencyMatrix): number {
  let count = 0;
  const size = matrix.languageIds.length;
  
  for (let i = 0; i < size; i++) {
    if (!matrix.matrix[i]) continue;
    for (let j = 0; j < size; j++) {
      const edge = matrix.matrix[i][j] as DirectedSuccinctnessRelation | null;
      if (edge && edge.derived === true) {
        count++;
      }
    }
  }
  
  return count;
}

function main(): void {
  console.log('=== Refresh Derived Edges ===\n');
  
  // Load database
  console.log('Loading database.json...');
  const database = loadDatabase();
  
  // Count existing derived edges
  const existingDerived = countDerivedEdges(database.adjacencyMatrix);
  console.log(`Found ${existingDerived} existing derived edges.\n`);
  
  // Remove derived edges
  console.log('Removing derived edges...');
  const { removed } = removeDerivedEdges(database.adjacencyMatrix);
  console.log(`Removed ${removed} derived edges.\n`);
  
  // Build graph data structure for propagation
  const graphData: GraphData = {
    languages: database.languages,
    references: database.references,
    separatingFunctions: database.separatingFunctions,
    complexities: database.complexities,
    tags: database.tags,
    adjacencyMatrix: database.adjacencyMatrix
  };
  
  // Run propagation
  console.log('Running propagation to regenerate derived edges...');
  console.log('---');
  const propagated = propagateImplicitRelations(graphData);
  console.log('---');
  
  // Count new derived edges
  const newDerived = countDerivedEdges(propagated.adjacencyMatrix);
  console.log(`\nGenerated ${newDerived} derived edges.`);
  
  // Update database with propagated matrix
  database.adjacencyMatrix = propagated.adjacencyMatrix;
  
  // Save
  console.log('\nSaving database.json...');
  saveDatabase(database);
  
  console.log('\n=== Done ===');
  console.log(`Summary: Removed ${removed} → Generated ${newDerived} derived edges`);
}

main();
