import type { KCReference } from '../types.js';
import { extractCitationKey } from '../utils/reference-id.js';
import database from './database.json';

/**
 * Extract a BibTeX field value, handling nested braces properly.
 * Supports both {value} and "value" delimiters.
 */
function extractBibtexField(bibtex: string, fieldName: string): string | null {
  // Match field = {value} or field = "value" or field = value (for simple values like year)
  const fieldPattern = new RegExp(
    `${fieldName}\\s*=\\s*(?:\\{|"|)`,
    'i'
  );
  
  const match = fieldPattern.exec(bibtex);
  if (!match) return null;
  
  const startPos = match.index + match[0].length;
  const delimiter = match[0].slice(-1);
  
  // For undelimited values (like year = 2002)
  if (delimiter !== '{' && delimiter !== '"') {
    const valueMatch = bibtex.slice(match.index).match(new RegExp(`${fieldName}\\s*=\\s*([^,}\\s]+)`, 'i'));
    return valueMatch ? valueMatch[1] : null;
  }
  
  const closeDelimiter = delimiter === '{' ? '}' : '"';
  
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
      // For quoted strings, just find the closing quote (ignoring escaped quotes)
      if (char === '"' && bibtex[pos - 1] !== '\\') break;
    }
    pos++;
  }
  
  return bibtex.slice(startPos, pos);
}

/**
 * Clean LaTeX escape sequences and formatting from a string.
 * Converts common LaTeX accents to Unicode characters.
 */
function cleanLatexString(str: string): string {
  return str
    // Handle double-escaped braces (from JSON encoding)
    .replace(/\\\\/g, '\\')
    // Common LaTeX accents - must handle both {\"{e}} and \"{e} forms
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
    // Remove remaining braces used for grouping
    .replace(/\{([^{}]*)\}/g, '$1')
    // Convert -- to en-dash
    .replace(/--/g, '–')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse BibTeX entry to extract metadata and format as IEEE citation
 */
export function parseBibtex(bibtex: string): { id: string; title: string; href: string } {
  const url = extractBibtexField(bibtex, 'url');
  const doi = extractBibtexField(bibtex, 'DOI');
  const titleRaw = extractBibtexField(bibtex, 'title');
  const authorRaw = extractBibtexField(bibtex, 'author');
  const year = extractBibtexField(bibtex, 'year');
  const journal = extractBibtexField(bibtex, 'journal');
  const booktitle = extractBibtexField(bibtex, 'booktitle');
  const volume = extractBibtexField(bibtex, 'volume');
  const pages = extractBibtexField(bibtex, 'pages');
  
  const id = extractCitationKey(bibtex) || 'unknown';
  
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
    
    // Use journal or booktitle (for conference papers)
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
  
  return { id, title, href };
}

/**
 * Database reference entry type - may have pre-parsed title and href or just bibtex.
 * If title/href are missing, they will be parsed from bibtex at runtime.
 */
interface DatabaseReference {
  id: string;
  bibtex: string;
  /** Pre-parsed/verified display title in IEEE format (optional - parsed from bibtex if missing) */
  title?: string;
  /** Pre-parsed/verified URL for the reference (optional - parsed from bibtex if missing) */
  href?: string;
}

// Build reference map from JSON data
const referencesMap: Record<string, KCReference> = {};

const referencesData = database.references as DatabaseReference[];

for (const ref of referencesData) {
  // If title or href are missing, parse them from bibtex
  if (ref.title && ref.href) {
    referencesMap[ref.id] = {
      id: ref.id,
      title: ref.title,
      href: ref.href,
      bibtex: ref.bibtex
    };
  } else {
    const parsed = parseBibtex(ref.bibtex);
    referencesMap[ref.id] = {
      id: ref.id,
      title: ref.title ?? parsed.title,
      href: ref.href ?? parsed.href,
      bibtex: ref.bibtex
    };
  }
}

export function getReference(id: string): KCReference | undefined {
  return referencesMap[id];
}

export function getReferences(...ids: string[]): KCReference[] {
  return ids.map(id => referencesMap[id]).filter(Boolean);
}

export const allReferences = Object.values(referencesMap);
