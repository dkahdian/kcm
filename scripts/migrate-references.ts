/**
 * Migration script to add pre-parsed title and href fields to references in database.json
 * Run with: npx tsx scripts/migrate-references.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract a BibTeX field value, handling nested braces properly
function extractBibtexField(bibtex: string, fieldName: string): string | null {
  const fieldPattern = new RegExp(`${fieldName}\\s*=\\s*(?:\\{|"|)`, 'i');
  const match = fieldPattern.exec(bibtex);
  if (!match) return null;
  
  const startPos = match.index + match[0].length;
  const delimiter = match[0].slice(-1);
  
  if (delimiter !== '{' && delimiter !== '"') {
    const valueMatch = bibtex.slice(match.index).match(new RegExp(`${fieldName}\\s*=\\s*([^,}\\s]+)`, 'i'));
    return valueMatch ? valueMatch[1] : null;
  }
  
  let depth = delimiter === '{' ? 1 : 0;
  let pos = startPos;
  
  while (pos < bibtex.length) {
    const char = bibtex[pos];
    if (delimiter === '{') {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) break;
      }
    } else {
      if (char === '"' && bibtex[pos - 1] !== '\\') break;
    }
    pos++;
  }
  
  return bibtex.slice(startPos, pos);
}

// Clean LaTeX escape sequences
function cleanLatexString(str: string): string {
  return str
    .replace(/\\\\/g, '\\')
    .replace(/\{?\\"\{([aeiouAEIOU])\}\}?/g, (_, c) => {
      const map: Record<string, string> = { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };
      return map[c] || c;
    })
    .replace(/\\"([aeiouAEIOU])/g, (_, c) => {
      const map: Record<string, string> = { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };
      return map[c] || c;
    })
    .replace(/\{?\\'([aeiouAEIOU])\}?/g, (_, c) => {
      const map: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' };
      return map[c] || c;
    })
    .replace(/\{?\\`([aeiouAEIOU])\}?/g, (_, c) => {
      const map: Record<string, string> = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' };
      return map[c] || c;
    })
    .replace(/\{?\\~([nNaAoO])\}?/g, (_, c) => {
      const map: Record<string, string> = { n: 'ñ', N: 'Ñ', a: 'ã', A: 'Ã', o: 'õ', O: 'Õ' };
      return map[c] || c;
    })
    .replace(/\{?\\c\{([cC])\}\}?/g, (_, c) => c === 'c' ? 'ç' : 'Ç')
    .replace(/\{?\\v\{([sczSCZ])\}\}?/g, (_, c) => {
      const map: Record<string, string> = { s: 'š', c: 'č', z: 'ž', S: 'Š', C: 'Č', Z: 'Ž' };
      return map[c] || c;
    })
    .replace(/\{([^{}]*)\}/g, '$1')
    .replace(/--/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse BibTeX to extract title and href
function parseBibtex(bibtex: string): { title: string; href: string } {
  const url = extractBibtexField(bibtex, 'url');
  const doi = extractBibtexField(bibtex, 'DOI');
  const titleRaw = extractBibtexField(bibtex, 'title');
  const authorRaw = extractBibtexField(bibtex, 'author');
  const year = extractBibtexField(bibtex, 'year');
  const journal = extractBibtexField(bibtex, 'journal');
  const booktitle = extractBibtexField(bibtex, 'booktitle');
  const volume = extractBibtexField(bibtex, 'volume');
  const pages = extractBibtexField(bibtex, 'pages');
  
  let href = '#';
  if (url) {
    href = url;
  } else if (doi) {
    href = `https://doi.org/${doi}`;
  }
  
  let title = 'Unknown Reference';
  
  if (authorRaw && titleRaw && year) {
    const authorList = authorRaw.split(/\s+and\s+/i);
    
    const formattedAuthors = authorList.map(author => {
      const cleaned = cleanLatexString(author);
      const parts = cleaned.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const lastName = parts[0];
        const firstNames = parts[1].split(/\s+/);
        const initials = firstNames
          .filter(name => name.length > 0)
          .map(name => name.charAt(0).toUpperCase() + '.')
          .join(' ');
        return `${initials} ${lastName}`;
      }
      return cleaned;
    });
    
    let authorsStr = '';
    if (formattedAuthors.length === 1) {
      authorsStr = formattedAuthors[0];
    } else if (formattedAuthors.length === 2) {
      authorsStr = `${formattedAuthors[0]} and ${formattedAuthors[1]}`;
    } else {
      authorsStr = formattedAuthors.slice(0, -1).join(', ') + ', and ' + formattedAuthors[formattedAuthors.length - 1];
    }
    
    const titleText = cleanLatexString(titleRaw);
    
    title = `${authorsStr}, "${titleText},"`;
    
    const venue = journal || booktitle;
    if (venue) {
      title += ` ${cleanLatexString(venue)},`;
    }
    
    if (volume) {
      title += ` vol. ${volume},`;
    }
    
    if (pages) {
      title += ` pp. ${cleanLatexString(pages)},`;
    }
    
    title += ` ${year}.`;
  } else if (titleRaw) {
    title = cleanLatexString(titleRaw);
  }
  
  return { title, href };
}

// Main migration
const databasePath = path.join(__dirname, '../src/lib/data/database.json');
const database = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));

console.log('Migrating references...\n');

const migratedRefs = database.references.map((ref: { id: string; bibtex: string }) => {
  const parsed = parseBibtex(ref.bibtex);
  console.log(`[${ref.id}]`);
  console.log(`  Title: ${parsed.title}`);
  console.log(`  URL: ${parsed.href}`);
  console.log('');
  
  return {
    id: ref.id,
    bibtex: ref.bibtex,
    title: parsed.title,
    href: parsed.href
  };
});

database.references = migratedRefs;

fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

console.log(`\nMigrated ${migratedRefs.length} references.`);
