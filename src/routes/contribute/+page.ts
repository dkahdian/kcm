import type { PageLoad } from './$types.js';
import { allLanguages } from '$lib/data/languages.js';
import { QUERIES, TRANSFORMATIONS } from '$lib/data/operations.js';
import { POLYTIME_COMPLEXITIES } from '$lib/data/polytime-complexities.js';
import { adjacencyMatrixData } from '$lib/data/edges.js';
import { relationTypes } from '$lib/data/relation-types.js';
import { allSeparatingFunctions } from '$lib/data/separating-functions.js';

export const load: PageLoad = () => {
  const existingLanguageIds = allLanguages.map((lang) => lang.name);

  const referenceLookup = new Map<string, string>();
  for (const language of allLanguages) {
    if (!language.references) continue;
    for (const ref of language.references) {
      if (!referenceLookup.has(ref.id)) {
        referenceLookup.set(ref.id, ref.title);
      }
    }
  }

  const existingReferences = Array.from(referenceLookup.entries()).map(([id, title]) => ({
    id,
    title
  }));

  const tagLookup = new Map<string, { label: string; color?: string }>();
  for (const language of allLanguages) {
    if (!language.tags) continue;
    for (const tag of language.tags) {
      if (!tagLookup.has(tag.label)) {
        tagLookup.set(tag.label, { label: tag.label, color: tag.color });
      }
    }
  }

  const existingTags = Array.from(tagLookup.values());

  const existingSeparatingFunctions = allSeparatingFunctions.map(sf => ({
    shortName: sf.shortName,
    name: sf.name,
    description: sf.description
  }));

  return {
    existingLanguageIds,
    existingReferences,
    existingSeparatingFunctions,
    existingTags,
    languages: allLanguages,
    queries: QUERIES,
    transformations: TRANSFORMATIONS,
    polytimeOptions: POLYTIME_COMPLEXITIES,
    adjacencyMatrix: adjacencyMatrixData,
    relationTypes
  };
};

export const prerender = false;
