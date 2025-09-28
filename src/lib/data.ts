import type { GraphData } from './types.js';

export const initialGraphData: GraphData = {
  languages: [
    {
      id: 'nnf',
      name: 'NNF',
      fullName: 'Negation Normal Form',
      description: 'Boolean formulas where negation appears only at the literal level',
      properties: {
        CO: true,  // Consistency
        VA: true,  // Validity
        CE: true,  // Clausal entailment
        IM: true,  // Implicant
        EQ: false, // Equivalence
        SU: true,  // Sentential conditioning
        CD: true,  // Conjunction
        FO: false, // Forgetting
        polySizeTransformations: ['CO', 'VA', 'CE', 'IM', 'SU', 'CD'],
        exponentialTransformations: ['EQ', 'FO']
      },
      position: { x: 200, y: 100 }
    },
    {
      id: 'dnf',
      name: 'DNF',
      fullName: 'Disjunctive Normal Form',
      description: 'Disjunction of conjunctions of literals',
      properties: {
        CO: true,  // Consistency
        VA: true,  // Validity 
        CE: true,  // Clausal entailment
        IM: true,  // Implicant
        EQ: true,  // Equivalence
        SU: true,  // Sentential conditioning
        CD: true,  // Conjunction
        FO: true,  // Forgetting
        polySizeTransformations: ['CO', 'VA', 'CE', 'IM', 'EQ', 'SU', 'CD', 'FO']
      },
      position: { x: 100, y: 300 }
    },
    {
      id: 'cnf',
      name: 'CNF',
      fullName: 'Conjunctive Normal Form',
      description: 'Conjunction of disjunctions of literals',
      properties: {
        CO: true,  // Consistency
        VA: false, // Validity
        CE: true,  // Clausal entailment
        IM: false, // Implicant
        EQ: false, // Equivalence
        SU: false, // Sentential conditioning
        CD: true,  // Conjunction
        FO: false, // Forgetting
        polySizeTransformations: ['CO', 'CE', 'CD'],
        exponentialTransformations: ['VA', 'IM', 'EQ', 'SU', 'FO']
      },
      position: { x: 300, y: 300 }
    }
  ],
  relations: [
    {
      id: 'nnf-dnf',
      source: 'nnf',
      target: 'dnf',
      type: 'succinctness',
      label: '≤',
      description: 'NNF is at least as succinct as DNF'
    },
    {
      id: 'nnf-cnf', 
      source: 'nnf',
      target: 'cnf',
      type: 'succinctness',
      label: '≤',
      description: 'NNF is at least as succinct as CNF'
    },
    {
      id: 'dnf-cnf',
      source: 'dnf',
      target: 'cnf', 
      type: 'incomparable',
      label: '||',
      description: 'DNF and CNF are incomparable in succinctness'
    }
  ]
};