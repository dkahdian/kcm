import type { KCBatchSelector, OperationLemma } from '../../../types.js';
import { OPERATION_LEMMAS } from '../../query-lemmas.js';
import {
  addFact,
  allAtoms,
  atomKey,
  batchAtom,
  edgeAtom,
  type EdgeKind,
  type FactContext,
  type FactTables,
  type OpKind,
  opAtom,
  opAssertsNoPoly,
  opGuaranteesPoly,
  operationTypeForCode,
  resolveBatchLanguageRef,
  selectorForBatch
} from '../facts/index.js';
import {
  atom,
  DatalogProgram,
  guardedRule,
  rule,
  variable,
  type DatalogValue
} from './engine.js';

const EDGE_KINDS: EdgeKind[] = ['leP', 'leQ', 'notLeP', 'notLeQ'];
const OP_KINDS: OpKind[] = ['supportsP', 'notSupportsP'];

const A = variable('a');
const B = variable('b');
const C = variable('c');
const D = variable('d');
const X = variable('x');
const Y = variable('y');
const L = variable('language');
const Q = variable('query');

export function deriveCandidateFactsWithDatalog(context: FactContext, tables: FactTables): FactTables {
  const program = buildProgram(context, tables, OPERATION_LEMMAS);
  program.materialize();
  const n = context.languageIds.length;

  // Batch facts are copied first so batch origin wins over a duplicate derived fact.
  for (const [batchIndex, language] of sortedFacts(program, 'batchApplies')) {
    if (!isIndex(batchIndex, context.batches.length) || !isIndex(language, n)) continue;
    addFact(tables, batchAtom(batchIndex, language), 'batch', n);

    const batch = context.batches[batchIndex];
    if (operationTypeForCode(context, batch.op) !== batch.opType) continue;
    const fact = opGuaranteesPoly(batch.status)
      ? opAtom('supportsP', language, batch.op)
      : opAssertsNoPoly(batch.status)
        ? opAtom('notSupportsP', language, batch.op)
        : null;
    if (!fact) continue;
    if (!context.batchSources.has(atomKey(fact))) context.batchSources.set(atomKey(fact), batchIndex);
    addFact(tables, fact, 'batch', n);
  }

  for (const kind of EDGE_KINDS) {
    for (const [source, target] of sortedFacts(program, kind)) {
      if (!isIndex(source, n) || !isIndex(target, n) || source === target) continue;
      addFact(tables, edgeAtom(kind, source, target), 'derived', n);
    }
  }
  for (const kind of OP_KINDS) {
    for (const [language, op] of sortedFacts(program, kind)) {
      if (!isIndex(language, n) || typeof op !== 'string') continue;
      addFact(tables, opAtom(kind, language, op), 'derived', n);
    }
  }

  for (let language = 0; language < n; language += 1) {
    tables.leP[language][language] = false;
    tables.leQ[language][language] = false;
  }
  return tables;
}

function buildProgram(context: FactContext, tables: FactTables, lemmas: OperationLemma[]): DatalogProgram {
  const program = new DatalogProgram();
  for (let language = 0; language < context.languageIds.length; language += 1) {
    program.addFact('language', language);
  }
  for (const query of context.operations.queryCodes) program.addFact('query', query);
  for (const fact of allAtoms(tables, context)) {
    switch (fact.kind) {
      case 'leP':
      case 'leQ':
      case 'notLeP':
      case 'notLeQ':
        program.addFact(fact.kind, fact.source, fact.target);
        break;
      case 'supportsP':
      case 'notSupportsP':
        program.addFact(fact.kind, fact.language, fact.op);
        break;
      case 'batchApplies':
        program.addFact(fact.kind, fact.batch, fact.language);
        break;
    }
  }

  addPropagationRules(program);
  addOperationLemmaRules(program, lemmas);
  addBatchRules(program, context);
  return program;
}

function addPropagationRules(program: DatalogProgram): void {
  // Positive closure and polynomial-to-quasipolynomial inclusion.
  program.addRule(guardedRule(atom('leP', A, C), [atom('leP', A, B), atom('leP', B, C)], unequal('a', 'c')));
  program.addRule(guardedRule(atom('leQ', A, C), [atom('leQ', A, B), atom('leQ', B, C)], unequal('a', 'c')));
  program.addRule(rule(atom('leQ', A, B), atom('leP', A, B)));

  // Reflexivity is available only through these internal reachability predicates.
  program.addRule(guardedRule(atom('reachP', A, B), [atom('language', A), atom('language', B)], equal('a', 'b')));
  program.addRule(rule(atom('reachP', A, B), atom('leP', A, B)));
  program.addRule(guardedRule(atom('reachQ', A, B), [atom('language', A), atom('language', B)], equal('a', 'b')));
  program.addRule(rule(atom('reachQ', A, B), atom('leP', A, B)));
  program.addRule(rule(atom('reachQ', A, B), atom('leQ', A, B)));

  // Explicit negative facts propagate against positive reachability.
  program.addRule(rule(atom('notLeP', A, B), atom('notLeQ', A, B)));
  program.addRule(guardedRule(
    atom('notLeP', X, Y),
    [atom('notLeP', C, D), atom('reachP', C, X), atom('reachP', Y, D)],
    unequal('x', 'y')
  ));
  program.addRule(guardedRule(
    atom('notLeQ', X, Y),
    [atom('notLeQ', C, D), atom('reachQ', C, X), atom('reachQ', Y, D)],
    unequal('x', 'y')
  ));

  // Queries transfer along polynomial compilations and can separate languages.
  program.addRule(rule(
    atom('supportsP', A, Q),
    atom('query', Q), atom('reachP', A, B), atom('supportsP', B, Q)
  ));
  program.addRule(rule(
    atom('notSupportsP', B, Q),
    atom('query', Q), atom('reachP', A, B), atom('notSupportsP', A, Q)
  ));
  program.addRule(guardedRule(
    atom('notLeP', B, A),
    [atom('query', Q), atom('supportsP', A, Q), atom('notSupportsP', B, Q)],
    unequal('a', 'b')
  ));
}

function addOperationLemmaRules(program: DatalogProgram, lemmas: OperationLemma[]): void {
  for (const lemma of lemmas) {
    const forwardBody = lemma.antecedent.length > 0
      ? lemma.antecedent.map((op) => atom('supportsP', L, op))
      : [atom('language', L)];
    program.addRule(rule(atom('supportsP', L, lemma.consequent), ...forwardBody));

    for (const target of lemma.antecedent) {
      const otherAntecedents = lemma.antecedent
        .filter((op) => op !== target)
        .map((op) => atom('supportsP', L, op));
      program.addRule(rule(
        atom('notSupportsP', L, target),
        atom('notSupportsP', L, lemma.consequent),
        ...otherAntecedents
      ));
    }
  }
}

function addBatchRules(program: DatalogProgram, context: FactContext): void {
  let nextSelector = 0;
  const compileSelector = (selector: KCBatchSelector): string => {
    const name = `selector_${nextSelector}`;
    nextSelector += 1;

    switch (selector.kind) {
      case 'list':
        for (const id of new Set(selector.languageIds)) {
          const language = context.languageIndex.get(id);
          if (language !== undefined) program.addFact(name, language);
        }
        break;
      case 'allOf': {
        const children = selector.selectors.map(compileSelector);
        program.addRule(rule(
          atom(name, L),
          ...(children.length > 0 ? children.map((child) => atom(child, L)) : [atom('language', L)])
        ));
        break;
      }
      case 'anyOf':
        for (const child of selector.selectors.map(compileSelector)) {
          program.addRule(rule(atom(name, L), atom(child, L)));
        }
        break;
      case 'edge':
        addEdgeSelectorRules(program, context, name, selector);
        break;
      case 'operation':
        addOperationSelectorRules(program, context, name, selector);
        break;
    }
    return name;
  };

  for (let batchIndex = 0; batchIndex < context.batches.length; batchIndex += 1) {
    const batch = context.batches[batchIndex];
    const selector = compileSelector(selectorForBatch(batch));
    program.addRule(rule(atom('batchApplies', batchIndex, L), atom(selector, L)));

    if (operationTypeForCode(context, batch.op) !== batch.opType) continue;
    const relation = opGuaranteesPoly(batch.status)
      ? 'supportsP'
      : opAssertsNoPoly(batch.status)
        ? 'notSupportsP'
        : undefined;
    if (relation) {
      program.addRule(rule(atom(relation, L, batch.op), atom('batchApplies', batchIndex, L)));
    }
  }
}

function addEdgeSelectorRules(
  program: DatalogProgram,
  context: FactContext,
  selectorRelation: string,
  selector: Extract<KCBatchSelector, { kind: 'edge' }>
): void {
  for (let language = 0; language < context.languageIds.length; language += 1) {
    const source = resolveBatchLanguageRef(context, language, selector.source);
    const target = resolveBatchLanguageRef(context, language, selector.target);
    if (source === undefined || target === undefined) continue;

    const positive = (selector.polarity ?? 'positive') === 'positive';
    if (source === target) {
      if (positive) program.addFact(selectorRelation, language);
      continue;
    }
    const relation = positive
      ? selector.level === 'poly' ? 'reachP' : 'reachQ'
      : selector.level === 'poly' ? 'notLeP' : 'notLeQ';
    program.addRule(rule(atom(selectorRelation, language), atom(relation, source, target)));
  }
}

function addOperationSelectorRules(
  program: DatalogProgram,
  context: FactContext,
  selectorRelation: string,
  selector: Extract<KCBatchSelector, { kind: 'operation' }>
): void {
  const relation = (selector.polarity ?? 'positive') === 'positive' ? 'supportsP' : 'notSupportsP';
  for (let language = 0; language < context.languageIds.length; language += 1) {
    const target = resolveBatchLanguageRef(context, language, selector.language);
    if (target === undefined) continue;
    program.addRule(rule(atom(selectorRelation, language), atom(relation, target, selector.op)));
  }
}

function sortedFacts(program: DatalogProgram, relation: string): DatalogValue[][] {
  return [...program.facts(relation)].sort(compareTuples).map((tuple) => [...tuple]);
}

function compareTuples(left: readonly DatalogValue[], right: readonly DatalogValue[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) continue;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }
  return 0;
}

function equal(left: string, right: string): (binding: ReadonlyMap<string, DatalogValue>) => boolean {
  return (binding) => binding.get(left) === binding.get(right);
}

function unequal(left: string, right: string): (binding: ReadonlyMap<string, DatalogValue>) => boolean {
  return (binding) => binding.get(left) !== binding.get(right);
}

function isIndex(value: DatalogValue, length: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
}
