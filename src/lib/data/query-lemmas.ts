import type { OperationLemma } from '../types.js';
import database from './database.json';

/**
 * Canonical operation implication lemmas loaded from database.json.
 * These define which operations imply other operations within the same language.
 * 
 * Operations can be queries (CO, VA, CT, etc.) or transformations (CD, FO, NOT_C, etc.).
 * 
 * These lemmas are NOT user-contributable. The complexity of the consequent 
 * is bounded by the maximum complexity of the antecedent operations.
 * 
 * References:
 * - Darwiche & Marquis (2002): "A Knowledge Compilation Map"
 */
export const OPERATION_LEMMAS: OperationLemma[] = database.operationLemmas as OperationLemma[];
