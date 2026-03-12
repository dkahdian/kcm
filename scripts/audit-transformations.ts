/**
 * One-off audit script: for each explicit (non-derived) transformation entry,
 * temporarily remove it, run propagation, and check if it gets re-derived
 * with the same complexity.
 *
 * Usage: npx tsx scripts/audit-transformations.ts
 */

import { writeFileSync } from 'fs';
import { loadDatabase, type DatabaseSchema } from './shared/database.js';
import { propagateImplicitRelations } from '../src/lib/data/propagation/index.js';
import { relationTypes, COMPLEXITIES } from '../src/lib/data/complexities.js';
import type { GraphData, KCAdjacencyMatrix, DirectedSuccinctnessRelation } from '../src/lib/types.js';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function removeDerivedEdges(matrix: KCAdjacencyMatrix): void {
  const size = matrix.languageIds.length;
  for (let i = 0; i < size; i++) {
    if (!matrix.matrix[i]) continue;
    for (let j = 0; j < size; j++) {
      const edge = matrix.matrix[i][j] as DirectedSuccinctnessRelation | null;
      if (!edge) continue;
      if (edge.status === 'no-poly-quasi' && (edge.noPolyDescription || edge.quasiDescription)) {
        const noPolyDerived = edge.noPolyDescription?.derived ?? true;
        const quasiDerived = edge.quasiDescription?.derived ?? true;
        if (noPolyDerived && quasiDerived) {
          matrix.matrix[i][j] = null;
        } else if (noPolyDerived && !quasiDerived) {
          matrix.matrix[i][j] = {
            status: 'unknown-poly-quasi',
            description: edge.quasiDescription!.description,
            refs: edge.quasiDescription!.refs,
            separatingFunctionIds: edge.separatingFunctionIds,
            hidden: false,
            derived: false
          };
        } else if (!noPolyDerived && quasiDerived) {
          matrix.matrix[i][j] = {
            status: 'no-poly-unknown-quasi',
            description: edge.noPolyDescription!.description,
            refs: edge.noPolyDescription!.refs,
            separatingFunctionIds: edge.separatingFunctionIds,
            hidden: false,
            derived: false
          };
        }
      } else if (edge.derived === true) {
        matrix.matrix[i][j] = null;
      }
    }
  }
}

function removeDerivedOperations(languages: any[]): void {
  for (const language of languages) {
    if (!language.properties) continue;
    if (language.properties.queries) {
      for (const [opCode, opData] of Object.entries(language.properties.queries)) {
        const op = opData as any;
        if (op && op.derived === true) {
          language.properties.queries[opCode] = { complexity: 'unknown-to-us', refs: [] };
        }
      }
    }
    if (language.properties.transformations) {
      for (const [opCode, opData] of Object.entries(language.properties.transformations)) {
        const op = opData as any;
        if (op && op.derived === true) {
          language.properties.transformations[opCode] = { complexity: 'unknown-to-us', refs: [] };
        }
      }
    }
  }
}

interface ExplicitTransformation {
  langName: string;
  langId: string;
  opCode: string;
  complexity: string;
  refs: string[];
  description?: string;
}

function main(): void {
  console.log('=== Transformation Derivability Audit ===\n');

  const baseDb = loadDatabase();

  // Find all explicit transformations
  const explicitTransforms: ExplicitTransformation[] = [];
  for (const lang of baseDb.languages) {
    const t = lang.properties?.transformations;
    if (!t) continue;
    for (const [opCode, data] of Object.entries(t)) {
      const d = data as any;
      if (d && !d.derived && d.complexity !== 'unknown-to-us') {
        explicitTransforms.push({
          langName: lang.name,
          langId: lang.id,
          opCode,
          complexity: d.complexity,
          refs: d.refs || [],
          description: d.description
        });
      }
    }
  }

  console.log(`Found ${explicitTransforms.length} explicit transformation entries.\n`);

  const derivable: ExplicitTransformation[] = [];
  const notDerivable: ExplicitTransformation[] = [];

  // Suppress console.log during propagation
  const origLog = console.log;
  const origWarn = console.warn;

  for (const entry of explicitTransforms) {
    // Deep clone the database for this test
    const testDb: DatabaseSchema = deepClone(baseDb);

    // Remove all derived edges/operations first
    removeDerivedEdges(testDb.adjacencyMatrix);
    removeDerivedOperations(testDb.languages);

    // Find the language and remove this specific transformation
    const lang = testDb.languages.find((l: any) => l.id === entry.langId);
    if (!lang?.properties?.transformations?.[entry.opCode]) {
      notDerivable.push(entry);
      continue;
    }
    // Replace with unknown
    lang.properties.transformations[entry.opCode] = {
      complexity: 'unknown-to-us',
      refs: []
    };

    // Run propagation
    const graphData: GraphData = {
      languages: testDb.languages,
      references: testDb.references,
      separatingFunctions: testDb.separatingFunctions ?? [],
      complexities: COMPLEXITIES,
      relationTypes: relationTypes,
      adjacencyMatrix: testDb.adjacencyMatrix,
      metadata: testDb.metadata
    };

    console.log = () => {};
    console.warn = () => {};
    try {
      propagateImplicitRelations(graphData);
    } finally {
      console.log = origLog;
      console.warn = origWarn;
    }

    // Check if the transformation was re-derived
    const updatedLang = graphData.languages.find((l: any) => l.id === entry.langId);
    const updatedOp = updatedLang?.properties?.transformations?.[entry.opCode] as any;

    if (updatedOp && updatedOp.derived === true && updatedOp.complexity === entry.complexity) {
      derivable.push(entry);
    } else {
      notDerivable.push(entry);
    }
  }

  const lines: string[] = [];
  lines.push('=== DERIVABLE Transformations (candidates for removal) ===\n');
  for (const e of derivable) {
    lines.push(`  ${e.langName} / ${e.opCode} => ${e.complexity}  refs: ${e.refs.join(', ')}`);
  }

  lines.push(`\n=== NOT DERIVABLE Transformations (must keep) ===\n`);
  for (const e of notDerivable) {
    lines.push(`  ${e.langName} / ${e.opCode} => ${e.complexity}  refs: ${e.refs.join(', ')}`);
  }

  lines.push(`\nTotal: ${derivable.length} derivable, ${notDerivable.length} not derivable out of ${explicitTransforms.length}`);

  const output = lines.join('\n');
  writeFileSync('audit-results.txt', output, 'utf8');
  console.log('Results written to audit-results.txt');
  console.log(`Total: ${derivable.length} derivable, ${notDerivable.length} not derivable out of ${explicitTransforms.length}`);
}

main();
