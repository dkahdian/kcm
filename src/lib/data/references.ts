import type { KCReference } from '../types.js';

/**
 * Extract citation key from BibTeX entry (e.g., "Darwiche_2002" from "@article{Darwiche_2002,")
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
  
  // Extract citation key as ID
  const id = extractCitationKey(bibtex) || 'unknown';
  
  // Extract href (prefer url, fallback to DOI link)
  let href = '#';
  if (urlMatch) {
    href = urlMatch[1];
  } else if (doiMatch) {
    href = `https://doi.org/${doiMatch[1]}`;
  }
  
  // Format as IEEE standard citation
  let title = 'Unknown Reference';
  
  if (authorMatch && titleMatch && yearMatch) {
    // Parse authors - IEEE format uses initials
    const authorsRaw = authorMatch[1];
    const authorList = authorsRaw.split(/\s+and\s+/i);
    
    const formattedAuthors = authorList.map(author => {
      // Handle "Last, First Middle" format
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
    
    // IEEE format: A. Author, B. Author, and C. Author, "Title," Journal, vol. X, pp. Y-Z, Year.
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

/**
 * Centralized repository of all academic references used across the knowledge compilation map.
 * Array of BibTeX entries - the citation key (e.g., "Darwiche_2002") is extracted as the ID.
 */
const allBibtexEntries: string[] = [
  `@article{Darwiche_2002,
   title={A Knowledge Compilation Map},
   volume={17},
   ISSN={1076-9757},
   url={http://dx.doi.org/10.1613/jair.989},
   DOI={10.1613/jair.989},
   journal={Journal of Artificial Intelligence Research},
   publisher={AI Access Foundation},
   author={Darwiche, A. and Marquis, P.},
   year={2002},
   month=sep, pages={229–264} }`
];

/**
 * Cache for parsed references to avoid re-parsing
 */
const referenceCache: Map<string, KCReference> = new Map();

/**
 * Build the reference lookup map on first access
 */
let referenceLookup: Map<string, string> | null = null;

function buildLookup(): Map<string, string> {
  if (!referenceLookup) {
    referenceLookup = new Map();
    for (const bibtex of allBibtexEntries) {
      const key = extractCitationKey(bibtex);
      if (key) {
        referenceLookup.set(key, bibtex);
      }
    }
  }
  return referenceLookup;
}

/**
 * Get a reference object from a BibTeX citation key.
 * Automatically generates title and href from the BibTeX, using IEEE format.
 */
function getReference(citationKey: string): KCReference {
  // Check cache first
  if (referenceCache.has(citationKey)) {
    return referenceCache.get(citationKey)!;
  }
  
  const lookup = buildLookup();
  const bibtex = lookup.get(citationKey);
  
  if (!bibtex) {
    console.warn(`Reference not found: ${citationKey}`);
    const fallback: KCReference = {
      id: citationKey,
      title: `Unknown reference: ${citationKey}`,
      href: '#',
      bibtex: ''
    };
    referenceCache.set(citationKey, fallback);
    return fallback;
  }
  
  const { id, title, href } = parseBibtex(bibtex);
  const ref: KCReference = {
    id,
    title,
    href,
    bibtex
  };
  
  referenceCache.set(citationKey, ref);
  return ref;
}

/**
 * Helper function to get reference objects from IDs.
 * Used by language definitions to populate their references array.
 */
export function getReferences(...ids: string[]): KCReference[] {
  return ids.map(getReference);
}
