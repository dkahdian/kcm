import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReferenceId } from '../../src/lib/utils/reference-id.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.join(rootDir, 'src/lib/data/json');

// Load contribution data
const contributionPath = path.join(rootDir, 'contribution.json');
const contribution = JSON.parse(fs.readFileSync(contributionPath, 'utf8'));

console.log('Processing contribution...');

try {
  // ============================================================================
  // 1. HANDLE NEW LANGUAGES
  // ============================================================================
  
  if (contribution.languagesToAdd && contribution.languagesToAdd.length > 0) {
    console.log(`\nAdding ${contribution.languagesToAdd.length} new language(s)...`);
    
    const languageIndexPath = path.join(dataDir, 'languages/index.json');
    const languageIds = JSON.parse(fs.readFileSync(languageIndexPath, 'utf8'));
    
    for (const lang of contribution.languagesToAdd) {
      console.log(`  - Adding language: ${lang.id}`);
      
      // Write language JSON file
      const langFilePath = path.join(dataDir, 'languages', `${lang.id}.json`);
      
      // Remove references field (it's generated at runtime)
      const { references, slug, ...langData } = lang;
      
      fs.writeFileSync(langFilePath, JSON.stringify(langData, null, 2), 'utf8');
      
      // Add to index if not already present
      if (!languageIds.includes(lang.id)) {
        languageIds.push(lang.id);
        languageIds.sort();
        fs.writeFileSync(languageIndexPath, JSON.stringify(languageIds, null, 2), 'utf8');
      }
    }
    
    console.log('Updated languages/index.json');
  }
  
  // ============================================================================
  // 2. HANDLE LANGUAGE EDITS
  // ============================================================================
  
  if (contribution.languagesToEdit && contribution.languagesToEdit.length > 0) {
    console.log(`\nEditing ${contribution.languagesToEdit.length} language(s)...`);
    
    for (const langUpdate of contribution.languagesToEdit) {
      console.log(`  - Updating language: ${langUpdate.id}`);
      
      const langFilePath = path.join(dataDir, 'languages', `${langUpdate.id}.json`);
      
      if (!fs.existsSync(langFilePath)) {
        throw new Error(`Language file not found: ${langUpdate.id}.json`);
      }
      
      const existing = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
      
      // Remove references and slug fields
      const { references, slug, ...updateData } = langUpdate;
      
      // Merge updates into existing
      const merged = { ...existing, ...updateData };
      
      fs.writeFileSync(langFilePath, JSON.stringify(merged, null, 2), 'utf8');
    }
  }
  
  // ============================================================================
  // 3. HANDLE EDGES/RELATIONSHIPS
  // ============================================================================
  
  if (contribution.relationships && contribution.relationships.length > 0) {
    console.log(`\nUpdating ${contribution.relationships.length} relationship(s)...`);
    
    const edgesPath = path.join(dataDir, 'edges.json');
    const edges = JSON.parse(fs.readFileSync(edgesPath, 'utf8'));
    
    // Load the full list of existing languages from the language index
    const languageIndexPath = path.join(dataDir, 'languages/index.json');
    const existingLanguageIds = JSON.parse(fs.readFileSync(languageIndexPath, 'utf8'));
    
    // Build list of all available language IDs (existing + newly added in this contribution)
    const newLanguageIds = (contribution.languagesToAdd || []).map((l: any) => l.id);
    const allAvailableLanguageIds = [...existingLanguageIds, ...newLanguageIds];
    
    for (const rel of contribution.relationships) {
      // Check if languages exist (either already in languages index or being added in this contribution)
      if (!allAvailableLanguageIds.includes(rel.sourceId)) {
        throw new Error(`Unknown source language in relationship: ${rel.sourceId} (not in existing languages or being added)`);
      }
      if (!allAvailableLanguageIds.includes(rel.targetId)) {
        throw new Error(`Unknown target language in relationship: ${rel.targetId} (not in existing languages or being added)`);
      }
      
      // Add language IDs to edges.languageIds if they're not already there
      if (!edges.languageIds.includes(rel.sourceId)) {
        edges.languageIds.push(rel.sourceId);
      }
      if (!edges.languageIds.includes(rel.targetId)) {
        edges.languageIds.push(rel.targetId);
      }
      
      // Sort to maintain consistent order
      edges.languageIds.sort();
      
      // Expand matrix if needed
      const requiredSize = edges.languageIds.length;
      while (edges.matrix.length < requiredSize) {
        edges.matrix.push(new Array(requiredSize).fill(null));
      }
      for (let i = 0; i < edges.matrix.length; i++) {
        while (edges.matrix[i].length < requiredSize) {
          edges.matrix[i].push(null);
        }
      }
      
      const sourceIdx = edges.languageIds.indexOf(rel.sourceId);
      const targetIdx = edges.languageIds.indexOf(rel.targetId);
      
      console.log(`  - ${rel.sourceId} -> ${rel.targetId} (${rel.status})`);
      
      edges.matrix[sourceIdx][targetIdx] = {
        status: rel.status,
        description: rel.description || '',
        refs: rel.refs || [],
        separatingFunctions: rel.separatingFunctions || []
      };
    }
    
    fs.writeFileSync(edgesPath, JSON.stringify(edges, null, 2), 'utf8');
    console.log('Updated edges.json');
  }
  
  // ============================================================================
  // 4. HANDLE NEW REFERENCES
  // ============================================================================
  
  if (contribution.newReferences && contribution.newReferences.length > 0) {
    console.log(`\nAdding ${contribution.newReferences.length} new reference(s)...`);
    
    const refPath = path.join(dataDir, 'references.json');
  const refs = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const existingIds = new Set<string>(refs.map((r: any) => String(r.id)));

    for (const rawRef of contribution.newReferences as Array<any>) {
      if (typeof rawRef !== 'string') {
        console.warn('  ! Skipping non-string reference payload:', rawRef);
        continue;
      }

  const generatedId = generateReferenceId(rawRef, existingIds);
  existingIds.add(generatedId);

  console.log(`  - Adding reference: ${generatedId}`);
      
  const existing = refs.find((r: any) => r.id === generatedId);
      if (existing) {
        console.log('    (already exists, skipping)');
        continue;
      }
      
      refs.push({
        id: generatedId,
        bibtex: rawRef
      });
    }
    
    refs.sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    fs.writeFileSync(refPath, JSON.stringify(refs, null, 2), 'utf8');
    console.log('Updated references.json');
  }
  
  console.log('\n✅ Contribution processed successfully!');
  
} catch (error: any) {
  console.error('\n❌ Error generating contribution:', error?.message || error);
  process.exit(1);
}
