import type { KCReference } from '../types.js';

/**
 * Centralized repository of all academic references used across the knowledge compilation map.
 * Each language file references entries from this catalog by ID.
 */
export const allReferences: Record<string, KCReference> = {
  'darwiche-2002': {
    id: 'darwiche-2002',
    title: 'Darwiche 2002',
    href: 'https://arxiv.org/pdf/1106.1819',
    bibtex: `@article{Darwiche_2002,
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
  }
};

/**
 * Helper function to get reference objects from IDs.
 * Used by language definitions to populate their references array.
 */
export function getReferences(...ids: string[]): KCReference[] {
  return ids.map(id => {
    const ref = allReferences[id];
    if (!ref) {
      console.warn(`Reference not found: ${id}`);
      return {
        id,
        title: `Unknown reference: ${id}`,
        href: '#',
        bibtex: ''
      };
    }
    return ref;
  });
}
