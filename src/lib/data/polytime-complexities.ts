import type { PolytimeFlagCode, PolytimeFlag } from '../types.js';
import database from './database.json';

export const POLYTIME_COMPLEXITIES: Record<PolytimeFlagCode, PolytimeFlag> = database.polytimeComplexities as Record<PolytimeFlagCode, PolytimeFlag>;

export function getPolytimeFlag(code: string): PolytimeFlag {
  return POLYTIME_COMPLEXITIES[code as PolytimeFlagCode] || POLYTIME_COMPLEXITIES['open'];
}

export function getComplexityEmoji(code: string): string {
  return getPolytimeFlag(code).emoji;
}

export function getComplexityColor(code: string): string {
  return getPolytimeFlag(code).color;
}
