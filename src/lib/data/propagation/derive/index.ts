import { type FactContext, type FactTables, isQueryCode } from '../facts/index.js';
import { deriveCandidateFactsWithDatalog } from './datalog.js';

export function deriveCandidateFacts(context: FactContext, tables: FactTables): FactTables {
  const result = deriveCandidateFactsWithDatalog(context, tables);
  validateNoContradictions(context, result);
  return result;
}

export function validateNoContradictions(context: FactContext, tables: FactTables): void {
  const n = context.languageIds.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (tables.leP[i][j] && tables.notLeP[i][j]) {
        throw new Error(`Contradiction: ${context.languageIds[i]} both compiles and does not compile polynomially to ${context.languageIds[j]}`);
      }
      if ((tables.leQ[i][j] || tables.leP[i][j]) && tables.notLeQ[i][j]) {
        throw new Error(`Contradiction: ${context.languageIds[i]} both compiles and does not compile quasipolynomially to ${context.languageIds[j]}`);
      }
      if (tables.transP[i][j] && tables.notTransP[i][j]) {
        throw new Error(`Contradiction: ${context.languageIds[i]} both does and does not admit a polynomial-time translation to ${context.languageIds[j]}`);
      }
    }
  }

  for (const op of context.operations.allCodes) {
    const supports = tables.supportsP.get(op);
    const notSupports = tables.notSupportsP.get(op);
    if (!supports || !notSupports) continue;
    for (let language = 0; language < n; language += 1) {
      if (supports[language] && notSupports[language]) {
        throw new Error(`Contradiction: ${context.languageIds[language]} both supports and does not support ${op}`);
      }
    }
  }

  for (const op of context.operations.allCodes) {
    if (!isQueryCode(op) && !context.operations.typeByCode.has(op)) {
      throw new Error(`Unknown operation in propagation: ${op}`);
    }
  }
}
