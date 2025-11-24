/**
 * Generate a deterministic hash-based ID from a language name.
 * Uses a simple FNV-1a hash to create an 8-character alphanumeric ID.
 * This ensures IDs are URL-safe, Cytoscape-safe, and collision-resistant.
 * 
 * Examples:
 * - "OBDD$_<$" -> "lang_a4f8c3d2"
 * - "NNF" -> "lang_b7e9d1a5"
 */
export function generateLanguageId(name: string): string {
  // FNV-1a hash (32-bit)
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to unsigned 32-bit and then to hex
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `lang_${hex}`;
}

/**
 * Check if an ID is safe for use in Cytoscape selectors
 */
export function isIdSafe(id: string): boolean {
  return /^lang_[a-f0-9]{8}$/.test(id);
}
