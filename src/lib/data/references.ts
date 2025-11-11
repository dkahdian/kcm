import type { KCReference } from '../types.js';
import database from './database.json';

/**
 * Extract citation key from BibTeX entry
 */
function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}

/**
 * Parse BibTeX entry to extract metadata and format as IEEE citation
 */
function parseBibtex(bibtex: string): { id: string; title: string; href: string } {
  const urlMatch = bibtex.match(/url\s*=\s*\{([^}]+)\}/i);
  const doiMatch = bibtex.match(/DOI\s*=\s*\{([^}]+)\}/i);
  const titleMatch = bibtex.match(/title\s*=\s*\{([^}]+)\}/i);
  const authorMatch = bibtex.match(/author\s*=\s*\{([^}]+)\}/i);
  const yearMatch = bibtex.match(/year\s*=\s*\{?(\d{4})\}?/i);
  const journalMatch = bibtex.match(/journal\s*=\s*\{([^}]+)\}/i);
  const volumeMatch = bibtex.match(/volume\s*=\s*\{([^}]+)\}/i);
  const pagesMatch = bibtex.match(/pages\s*=\s*\{([^}]+)\}/i);
  
  const id = extractCitationKey(bibtex) || 'unknown';
  
  let href = '#';
  if (urlMatch) {
    href = urlMatch[1];
  } else if (doiMatch) {
    href = `https://doi.org/${doiMatch[1]}`;
  }
  
  let title = 'Unknown Reference';
  
  if (authorMatch && titleMatch && yearMatch) {
    const authorsRaw = authorMatch[1];
    const authorList = authorsRaw.split(/\s+and\s+/i);
    
    const formattedAuthors = authorList.map(author => {
      const parts = author.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const lastName = parts[0];
        const firstNames = parts[1].split(/\s+/);
        const initials = firstNames.map(name => name.charAt(0).toUpperCase() + '.').join(' ');
        return `${initials} ${lastName}`;
      }
      return author;
    });
    
    let authorsStr = '';
    if (formattedAuthors.length === 1) {
      authorsStr = formattedAuthors[0];
    } else if (formattedAuthors.length === 2) {
      authorsStr = `${formattedAuthors[0]} and ${formattedAuthors[1]}`;
    } else {
      authorsStr = formattedAuthors.slice(0, -1).join(', ') + ', and ' + formattedAuthors[formattedAuthors.length - 1];
    }
    
    const titleText = titleMatch[1];
    const year = yearMatch[1];
    
    title = `${authorsStr}, "${titleText},"`;
    
    if (journalMatch) {
      title += ` ${journalMatch[1]},`;
    }
    
    if (volumeMatch) {
      title += ` vol. ${volumeMatch[1]},`;
    }
    
    if (pagesMatch) {
      title += ` pp. ${pagesMatch[1]},`;
    }
    
    title += ` ${year}.`;
  } else if (titleMatch) {
    title = titleMatch[1];
  }
  
  return { id, title, href };
}

// Build reference map from JSON data
const referencesMap: Record<string, KCReference> = {};

const referencesData = database.references as Array<{ id: string; bibtex: string }>;

for (const ref of referencesData) {
  const parsed = parseBibtex(ref.bibtex);
  referencesMap[ref.id] = {
    id: ref.id,
    title: parsed.title,
    href: parsed.href,
    bibtex: ref.bibtex
  };
}

export function getReference(id: string): KCReference | undefined {
  return referencesMap[id];
}

export function getReferences(...ids: string[]): KCReference[] {
  return ids.map(id => referencesMap[id]).filter(Boolean);
}

export const allReferences = Object.values(referencesMap);
