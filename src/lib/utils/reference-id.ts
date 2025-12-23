/**
 * Utilities for generating consistent reference identifiers from BibTeX entries.
 */

/**
 * Extract a representative author surname and publication year from a BibTeX string.
 */
export function parseBibtexForId(bibtex: string): { author: string; year: string } | null {
  const authorMatch = bibtex.match(/author\s*=\s*[{"']([^}"']+)[}"']/i);
  let author = 'Unknown';

  if (authorMatch) {
    const authorStr = authorMatch[1];
    const firstAuthor = authorStr.split(/\s+and\s+/i)[0].trim();

    if (firstAuthor.includes(',')) {
      author = firstAuthor.split(',')[0].trim();
    } else {
      const words = firstAuthor.trim().split(/\s+/);
      author = words[words.length - 1];
    }

    author = author.replace(/[{}]/g, '').trim();
  }

  const yearMatch = bibtex.match(/year\s*=\s*[{"']?(\d{4})[}"']?/i);
  const year = yearMatch ? yearMatch[1] : 'XXXX';

  return { author, year };
}

/**
 * Generate a stable reference identifier using author and year data.
 */
export function generateReferenceId(bibtex: string, existingIds: Set<string>): string {
  const parsed = parseBibtexForId(bibtex);

  if (!parsed) {
    let fallbackId = 'Reference_Unknown';
    let counter = 1;
    while (existingIds.has(fallbackId)) {
      fallbackId = `Reference_Unknown_${counter}`;
      counter++;
    }
    return fallbackId;
  }

  const baseId = `${parsed.author}_${parsed.year}`;

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (const suffix of suffixes) {
    const idWithSuffix = `${baseId}_${suffix}`;
    if (!existingIds.has(idWithSuffix)) {
      return idWithSuffix;
    }
  }

  let counter = 1;
  while (existingIds.has(`${baseId}_${counter}`)) {
    counter++;
  }
  return `${baseId}_${counter}`;
}

/**
 * Extract the citation key from a BibTeX entry.
 * @example extractCitationKey('@article{Smith2020, ...}') => 'Smith2020'
 */
export function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}
