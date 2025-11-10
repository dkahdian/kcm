/**
 * Submission ID Generator
 * 
 * Generates unique submission IDs for contribution tracking
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new submission ID (UUID v4)
 */
export function generateSubmissionId(): string {
  return uuidv4();
}

/**
 * Validate submission ID format (UUID v4)
 */
export function isValidSubmissionId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}
