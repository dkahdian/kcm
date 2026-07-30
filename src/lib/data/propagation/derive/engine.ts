export type DatalogValue = string | number;

export interface Variable {
  variable: string;
}

export type Term = DatalogValue | Variable;

export interface Atom {
  relation: string;
  terms: Term[];
}

export interface Rule {
  head: Atom;
  body: Atom[];
  guard?: (binding: ReadonlyMap<string, DatalogValue>) => boolean;
}

type Tuple = DatalogValue[];
type Binding = Map<string, DatalogValue>;

/** A finite, positive Datalog program evaluated to its least fixed point. */
export class DatalogProgram {
  private readonly relations = new Map<string, Relation>();
  private readonly rules: Rule[] = [];

  addFact(relation: string, ...tuple: DatalogValue[]): boolean {
    return this.relation(relation, tuple.length).add(tuple);
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  materialize(): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const rule of this.rules) {
        for (const binding of this.matchBody(rule.body, 0, new Map())) {
          if (rule.guard && !rule.guard(binding)) continue;
          const tuple = rule.head.terms.map((term) => resolve(term, binding));
          changed = this.addFact(rule.head.relation, ...tuple) || changed;
        }
      }
    }
  }

  facts(relation: string): readonly Tuple[] {
    return this.relations.get(relation)?.facts() ?? [];
  }

  private *matchBody(body: Atom[], index: number, binding: Binding): Generator<Binding> {
    if (index === body.length) {
      yield binding;
      return;
    }

    const atom = body[index];
    const relation = this.relations.get(atom.relation);
    if (!relation) return;
    for (const tuple of relation.candidates(atom.terms, binding)) {
      const extended = unify(atom.terms, tuple, binding);
      if (extended) yield* this.matchBody(body, index + 1, extended);
    }
  }

  private relation(name: string, arity: number): Relation {
    const existing = this.relations.get(name);
    if (existing) {
      if (existing.arity !== arity) throw new Error(`Datalog arity mismatch for ${name}`);
      return existing;
    }
    const created = new Relation(arity);
    this.relations.set(name, created);
    return created;
  }
}

class Relation {
  readonly arity: number;
  private readonly tuples: Tuple[] = [];
  private readonly keys = new Set<string>();
  private readonly indexes: Array<Map<DatalogValue, Tuple[]>>;

  constructor(arity: number) {
    this.arity = arity;
    this.indexes = Array.from({ length: arity }, () => new Map());
  }

  add(input: Tuple): boolean {
    if (input.length !== this.arity) throw new Error('Datalog tuple has the wrong arity');
    const key = tupleKey(input);
    if (this.keys.has(key)) return false;
    const tuple = [...input];
    this.keys.add(key);
    this.tuples.push(tuple);
    for (let column = 0; column < tuple.length; column += 1) {
      const index = this.indexes[column];
      const bucket = index.get(tuple[column]);
      if (bucket) bucket.push(tuple);
      else index.set(tuple[column], [tuple]);
    }
    return true;
  }

  facts(): readonly Tuple[] {
    return this.tuples;
  }

  candidates(terms: Term[], binding: ReadonlyMap<string, DatalogValue>): readonly Tuple[] {
    let best: readonly Tuple[] | undefined;
    for (let column = 0; column < terms.length; column += 1) {
      const value = knownValue(terms[column], binding);
      if (value === undefined) continue;
      const bucket = this.indexes[column].get(value) ?? [];
      if (!best || bucket.length < best.length) best = bucket;
    }
    return best ?? this.tuples;
  }
}

export function variable(name: string): Variable {
  return { variable: name };
}

export function atom(relation: string, ...terms: Term[]): Atom {
  return { relation, terms };
}

export function rule(head: Atom, ...body: Atom[]): Rule {
  return { head, body };
}

export function guardedRule(
  head: Atom,
  body: Atom[],
  guard: (binding: ReadonlyMap<string, DatalogValue>) => boolean
): Rule {
  return { head, body, guard };
}

function knownValue(term: Term, binding: ReadonlyMap<string, DatalogValue>): DatalogValue | undefined {
  return isVariable(term) ? binding.get(term.variable) : term;
}

function resolve(term: Term, binding: ReadonlyMap<string, DatalogValue>): DatalogValue {
  if (!isVariable(term)) return term;
  const value = binding.get(term.variable);
  if (value === undefined) throw new Error(`Unsafe Datalog head variable: ${term.variable}`);
  return value;
}

function unify(terms: Term[], tuple: Tuple, binding: Binding): Binding | undefined {
  const result = new Map(binding);
  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    const value = tuple[index];
    if (!isVariable(term)) {
      if (term !== value) return undefined;
      continue;
    }
    const prior = result.get(term.variable);
    if (prior !== undefined && prior !== value) return undefined;
    result.set(term.variable, value);
  }
  return result;
}

function isVariable(term: Term): term is Variable {
  return typeof term === 'object';
}

function tupleKey(tuple: Tuple): string {
  return tuple.map((value) => `${typeof value === 'number' ? 'n' : 's'}:${String(value).length}:${value}`).join('|');
}
