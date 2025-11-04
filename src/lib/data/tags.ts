import type { KCTag } from '../types.js';
import tagsData from './json/tags.json';

export type BaseTag = Omit<KCTag, 'refs'> & { refs?: string[] };

export const CANONICAL_TAGS: Record<string, BaseTag> = tagsData as Record<string, BaseTag>;

export function getTag(id: string): BaseTag | undefined {
  return CANONICAL_TAGS[id];
}

export function getTags(ids: string[], refs: string[] = []): KCTag[] {
  return ids.map(id => {
    const tag = CANONICAL_TAGS[id];
    if (!tag) {
      console.warn(`Tag '${id}' not found in canonical tags`);
      return { id, label: id, color: '#6366f1', refs };
    }
    return { ...tag, refs };
  });
}

export function getAllTags(): BaseTag[] {
  return Object.values(CANONICAL_TAGS);
}
