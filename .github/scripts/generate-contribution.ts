import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReferenceId } from '../../src/lib/utils/reference-id.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.join(rootDir, 'src/lib/data');
const databasePath = path.join(dataDir, 'database.json');

type RawLanguage = Record<string, any> & { id: string };
type DirectedRelation = {
  status: string;
  description?: string;
  refs: string[];
  separatingFunctions: any[];
};

interface DatabaseShape {
  languages: RawLanguage[];
  references: Array<{ id: string; bibtex: string }>;
  relationTypes: unknown;
  tags: unknown;
  operations: unknown;
  polytimeComplexities: unknown;
  adjacencyMatrix: {
    languageIds: string[];
    matrix: (DirectedRelation | null)[][];
  };
}

const database = JSON.parse(fs.readFileSync(databasePath, 'utf8')) as DatabaseShape;

// Load contribution data
const contributionPath = path.join(rootDir, 'contribution.json');
const contribution = JSON.parse(fs.readFileSync(contributionPath, 'utf8'));

console.log('Processing contribution...');

try {
  // ============================================================================
  // 1. HANDLE NEW LANGUAGES
  // ============================================================================
  
  const existingLanguageMap = new Map<string, RawLanguage>(
    database.languages.map((lang) => [lang.id, lang])
  );

  const sanitizeLanguagePayload = (raw: any): RawLanguage => {
    const { references, slug, existingReferences, ...rest } = raw;
    return rest as RawLanguage;
  };

  if (contribution.languagesToAdd && contribution.languagesToAdd.length > 0) {
    console.log(`\nAdding ${contribution.languagesToAdd.length} new language(s)...`);

    for (const lang of contribution.languagesToAdd) {
      console.log(`  - Adding language: ${lang.id}`);
      if (existingLanguageMap.has(lang.id)) {
        throw new Error(`Language already exists: ${lang.id}`);
      }

      const sanitized = sanitizeLanguagePayload(lang);
      database.languages.push(sanitized);
      existingLanguageMap.set(sanitized.id, sanitized);
    }
  }
  
  // ============================================================================
  // 2. HANDLE LANGUAGE EDITS
  // ============================================================================
  
  if (contribution.languagesToEdit && contribution.languagesToEdit.length > 0) {
    console.log(`\nEditing ${contribution.languagesToEdit.length} language(s)...`);
    
    for (const langUpdate of contribution.languagesToEdit) {
      console.log(`  - Updating language: ${langUpdate.id}`);
      const existing = existingLanguageMap.get(langUpdate.id);
      if (!existing) {
        throw new Error(`Language not found: ${langUpdate.id}`);
      }

      const sanitized = sanitizeLanguagePayload(langUpdate);
      const merged = { ...existing, ...sanitized } as RawLanguage;

      existingLanguageMap.set(langUpdate.id, merged);

      const index = database.languages.findIndex((lang) => lang.id === langUpdate.id);
      if (index !== -1) {
        database.languages[index] = merged;
      }
    }
  }
  
  // ============================================================================
  // 3. HANDLE EDGES/RELATIONSHIPS
  // ============================================================================
  
  const relationKey = (sourceId: string, targetId: string) => `${sourceId}→${targetId}`;

  const relationMap = new Map<string, DirectedRelation>();

  const baseLanguageIds = database.adjacencyMatrix.languageIds || [];
  const baseMatrix = database.adjacencyMatrix.matrix || [];

  for (let i = 0; i < baseLanguageIds.length; i++) {
    for (let j = 0; j < baseLanguageIds.length; j++) {
      const relation = baseMatrix[i]?.[j] || null;
      if (relation) {
        relationMap.set(relationKey(baseLanguageIds[i], baseLanguageIds[j]), {
          status: relation.status,
          description: relation.description,
          refs: relation.refs || [],
          separatingFunctions: relation.separatingFunctions || []
        });
      }
    }
  }

  if (contribution.relationships && contribution.relationships.length > 0) {
    console.log(`\nUpdating ${contribution.relationships.length} relationship(s)...`);

    const newlyAddedIds = (contribution.languagesToAdd || []).map((lang: any) => lang.id);
    const allKnownIds = new Set(existingLanguageMap.keys());
    newlyAddedIds.forEach((id) => allKnownIds.add(id));

    for (const rel of contribution.relationships) {
      if (!allKnownIds.has(rel.sourceId)) {
        throw new Error(`Unknown source language in relationship: ${rel.sourceId}`);
      }
      if (!allKnownIds.has(rel.targetId)) {
        throw new Error(`Unknown target language in relationship: ${rel.targetId}`);
      }

      console.log(`  - ${rel.sourceId} -> ${rel.targetId} (${rel.status})`);

      relationMap.set(relationKey(rel.sourceId, rel.targetId), {
        status: rel.status,
        description: rel.description || '',
        refs: rel.refs || [],
        separatingFunctions: rel.separatingFunctions || []
      });
    }

    console.log('Updated adjacency relationships in memory');
  }
  
  // ============================================================================
  // 4. HANDLE NEW REFERENCES
  // ============================================================================
  
  if (contribution.newReferences && contribution.newReferences.length > 0) {
    console.log(`\nAdding ${contribution.newReferences.length} new reference(s)...`);
    
    const refs = database.references;
    const existingIds = new Set<string>(refs.map((r) => String(r.id)));

    for (const rawRef of contribution.newReferences as Array<any>) {
      if (typeof rawRef !== 'string') {
        console.warn('  ! Skipping non-string reference payload:', rawRef);
        continue;
      }

      const generatedId = generateReferenceId(rawRef, existingIds);
      existingIds.add(generatedId);

      console.log(`  - Adding reference: ${generatedId}`);

      const existing = refs.find((r) => r.id === generatedId);
      if (existing) {
        console.log('    (already exists, skipping)');
        continue;
      }

      refs.push({
        id: generatedId,
        bibtex: rawRef
      });
    }

    refs.sort((a, b) => a.id.localeCompare(b.id));
    console.log('Prepared reference updates');
  }

  // Sort languages for deterministic ordering
  database.languages.sort((a, b) => a.id.localeCompare(b.id));

  const orderedLanguageIds = database.languages.map((lang) => lang.id);

  // Ensure any languages mentioned in relations are included
  for (const key of relationMap.keys()) {
    const [sourceId, targetId] = key.split('→');
    if (!orderedLanguageIds.includes(sourceId)) {
      orderedLanguageIds.push(sourceId);
    }
    if (!orderedLanguageIds.includes(targetId)) {
      orderedLanguageIds.push(targetId);
    }
  }

  const uniqueLanguageIds = Array.from(new Set(orderedLanguageIds)).sort((a, b) => a.localeCompare(b));

  const size = uniqueLanguageIds.length;
  const rebuiltMatrix: (DirectedRelation | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const key = relationKey(uniqueLanguageIds[i], uniqueLanguageIds[j]);
      const relation = relationMap.get(key) || null;
      if (relation) {
        rebuiltMatrix[i][j] = {
          status: relation.status,
          description: relation.description || '',
          refs: [...new Set(relation.refs)],
          separatingFunctions: relation.separatingFunctions || []
        };
      }
    }
  }

  database.adjacencyMatrix = {
    languageIds: uniqueLanguageIds,
    matrix: rebuiltMatrix
  };

  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
  console.log('Wrote consolidated database.json');
  
  console.log('\n✅ Contribution processed successfully!');
  
} catch (error: any) {
  console.error('\n❌ Error generating contribution:', error?.message || error);
  process.exit(1);
}
