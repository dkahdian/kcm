/** Seed documented polynomial translators from the existing authored poly edges. */
import { loadDatabase, saveDatabase } from './shared/database.js';

const database = loadDatabase();
const { languageIds, indexByLanguage, matrix } = database.adjacencyMatrix;
const size = languageIds.length;
let seeded = 0;

database.translatabilityMatrix = {
  languageIds: [...languageIds],
  indexByLanguage: { ...indexByLanguage },
  matrix: Array.from({ length: size }, (_, source) => Array.from({ length: size }, (_, target) => {
    const relation = matrix[source]?.[target];
    if (!relation || relation.status !== 'poly' || relation.derived || relation.origin === 'derived' || relation.origin === 'batch') return null;
    seeded += 1;
    return {
      status: 'poly' as const,
      refs: [...relation.refs],
      ...(relation.description ? { description: relation.description } : {}),
      ...(relation.assumption ? { assumption: relation.assumption } : {}),
      derived: false,
      origin: 'authored' as const
    };
  }))
};

saveDatabase(database);
console.log(`Seeded ${seeded} authored polynomial translator claims.`);
