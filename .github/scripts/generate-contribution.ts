import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    for (const rel of contribution.relationships) {
      const sourceIdx = edges.languageIds.indexOf(rel.sourceId);
      const targetIdx = edges.languageIds.indexOf(rel.targetId);
      
      if (sourceIdx === -1 || targetIdx === -1) {
        throw new Error(`Unknown language in relationship: ${rel.sourceId} -> ${rel.targetId}`);
      }
      
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
    
    for (const newRef of contribution.newReferences) {
      console.log(`  - Adding reference: ${newRef.id}`);
      
      // Check if reference already exists
      const existing = refs.find((r: any) => r.id === newRef.id);
      if (existing) {
        console.log(`    (already exists, skipping)`);
        continue;
      }
      
      refs.push({
        id: newRef.id,
        bibtex: newRef.bibtex
      });
    }
    
    // Sort references by ID for consistency
    refs.sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    fs.writeFileSync(refPath, JSON.stringify(refs, null, 2), 'utf8');
    console.log('Updated references.json');
  }
  
  console.log('\n✅ Contribution processed successfully!');
  
} catch (error: any) {
  console.error('\n❌ Error generating contribution:', error?.message || error);
  process.exit(1);
}
