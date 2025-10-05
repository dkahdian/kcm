import type { GraphData, LanguageFilter, KCLanguage, FilterCategory } from './types.js';

export const initialGraphData: GraphData = {
  relationTypes: [
    {
      id: 'succinctness',
      name: 'Succinctness',
      label: '≤',
      description: 'A is at least as succinct as B',
      style: { lineColor: '#1e40af', lineStyle: 'solid', width: 2, targetArrow: 'triangle' }
    },
    {
      id: 'equivalence',
      name: 'Equivalence',
      label: '≡',
      description: 'A is equivalent to B',
      style: { lineColor: '#059669', lineStyle: 'solid', width: 2, targetArrow: 'triangle-backcurve' }
    },
    {
      id: 'incomparable',
      name: 'Incomparable',
      label: '∥',
      description: 'A and B are incomparable in succinctness',
      style: { lineColor: '#dc2626', lineStyle: 'dashed', width: 2, targetArrow: 'none' }
    }
  ],
  languages: [
    // Base NNF family and refinements
    {
      id: 'nnf',
      name: 'NNF',
      fullName: 'Negation Normal Form',
      description: 'Boolean formulas where negation appears only at the literal level',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'normal-form', label: 'Normal Form', color: '#6366f1' },
        { id: 'general', label: 'General', color: '#10b981' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 200, y: 100 },
      children: [
        { id: 'nnf-dnnf', target: 'dnnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNNF' },
        { id: 'nnf-dnf', target: 'dnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as DNF' },
        { id: 'nnf-cnf', target: 'cnf', typeId: 'succinctness', label: '≤', description: 'NNF is at least as succinct as CNF' }
      ]
    },
    {
      id: 'dnnf',
      name: 'DNNF',
      fullName: 'Decomposable Negation Normal Form',
      description: 'NNF with decomposability: conjuncts do not share variables',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'decomposability', label: 'Decomposability', color: '#84cc16' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 50, y: 180 },
      children: [
        { id: 'dnnf-d-dnnf', target: 'd-dnnf', typeId: 'succinctness', label: '≤', description: 'DNNF is at least as succinct as d-DNNF' }
      ]
    },
    {
      id: 'd-nnf',
      name: 'd-NNF',
      fullName: 'Deterministic Negation Normal Form',
      description: 'NNF with determinism: disjuncts are logically disjoint',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'determinism', label: 'Determinism', color: '#ef4444' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 200, y: 180 }
    },
    {
      id: 's-nnf',
      name: 's-NNF',
      fullName: 'Smooth Negation Normal Form',
      description: 'NNF with smoothness: disjuncts mention the same set of variables',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'smoothness', label: 'Smoothness', color: '#06b6d4' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 350, y: 180 }
    },
    {
      id: 'f-nnf',
      name: 'f-NNF',
      fullName: 'Flat Negation Normal Form',
      description: 'NNF with flatness: height at most 2',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'flatness', label: 'Flatness', color: '#7c3aed' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 500, y: 180 }
    },
    {
      id: 'd-dnnf',
      name: 'd-DNNF',
      fullName: 'Deterministic Decomposable Negation Normal Form',
      description: 'DNNF with determinism',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'unknown' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'decomposability', label: 'Decomposability', color: '#84cc16' },
        { id: 'determinism', label: 'Determinism', color: '#ef4444' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 125, y: 260 },
      children: [
        { id: 'd-dnnf-fbdd', target: 'fbdd', typeId: 'succinctness', label: '≤', description: 'd-DNNF is at least as succinct as FBDD' }
      ]
    },
    {
      id: 'sd-dnnf',
      name: 'sd-DNNF',
      fullName: 'Smooth Deterministic Decomposable Negation Normal Form',
      description: 'd-DNNF with smoothness',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'unknown' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'decomposability', label: 'Decomposability', color: '#84cc16' },
        { id: 'determinism', label: 'Determinism', color: '#ef4444' },
        { id: 'smoothness', label: 'Smoothness', color: '#06b6d4' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 275, y: 260 },
      children: [
        { id: 'sd-dnnf-equiv-d-dnnf', target: 'd-dnnf', typeId: 'equivalence', label: '≡', description: 'sd-DNNF is equivalent to d-DNNF' }
      ]
    },
    // Decision diagram family
    {
      id: 'bdd',
      name: 'BDD',
      fullName: 'Binary Decision Diagram',
      description: 'Decision DAGs with boolean branching on variables',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'false' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'decision', label: 'Decision', color: '#f59e0b' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 425, y: 260 }
    },
    {
      id: 'fbdd',
      name: 'FBDD',
      fullName: 'Free Binary Decision Diagram',
      description: 'BDD without a fixed variable ordering (free order)',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'false' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'unknown' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'decision', label: 'Decision', color: '#f59e0b' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 575, y: 260 },
      children: [
        { id: 'fbdd-obdd', target: 'obdd', typeId: 'succinctness', label: '≤', description: 'FBDD is at least as succinct as OBDD' }
      ]
    },
    {
      id: 'obdd',
      name: 'OBDD',
      fullName: 'Ordered Binary Decision Diagram',
      description: 'BDD with a fixed variable ordering',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'true' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'decision', label: 'Decision', color: '#f59e0b' },
        { id: 'ordering', label: 'Ordering', color: '#22c55e' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 725, y: 260 },
      children: [
        { id: 'obdd-obdd-lt', target: 'obdd-lt', typeId: 'succinctness', label: '≤', description: 'OBDD is at least as succinct as OBDD<' }
      ]
    },
    {
      id: 'obdd-lt',
      name: 'OBDD<',
      fullName: 'Ordered Binary Decision Diagram (using order <)',
      description: 'OBDDs under a specific ordering constraint (<)',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'true' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'decision', label: 'Decision', color: '#f59e0b' },
        { id: 'ordering', label: 'Ordering', color: '#22c55e' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 875, y: 260 },
      children: [
        { id: 'obdd-lt-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'OBDD< is at least as succinct as MODS' }
      ]
    },
    // Classical normal forms and other compiled forms
    {
      id: 'dnf',
      name: 'DNF',
      fullName: 'Disjunctive Normal Form',
      description: 'Disjunction of conjunctions of literals',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'dnf', label: 'DNF', color: '#f59e0b' },
        { id: 'flatness', label: 'Flatness', color: '#7c3aed' },
        { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 100, y: 300 },
      children: [
        { id: 'dnf-ip', target: 'ip', typeId: 'succinctness', label: '≤', description: 'DNF is at least as succinct as IP' }
      ]
    },
    {
      id: 'cnf',
      name: 'CNF',
      fullName: 'Conjunctive Normal Form',
      description: 'Conjunction of disjunctions of literals',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'false' },
          { code: 'VA', label: 'Validity', polytime: 'false' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'false' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'false' },
          { code: 'CT', label: 'Model Counting', polytime: 'false' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'false' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'false', note: 'Unless P=NP' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'false', note: 'Unless P=NP' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'false', note: 'Unless P=NP' }
        ]
      },
      tags: [
        { id: 'cnf', label: 'CNF', color: '#ef4444' },
        { id: 'flatness', label: 'Flatness', color: '#7c3aed' },
        { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 300, y: 300 },
      children: [
        { id: 'cnf-pi', target: 'pi', typeId: 'succinctness', label: '≤', description: 'CNF is at least as succinct as PI' }
      ]
    },
    {
      id: 'pi',
      name: 'PI',
      fullName: 'Prime Implicates',
      description: 'Representation by the set of prime implicates',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'false' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'true' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'prime-implicates', label: 'Prime Implicates', color: '#8b5cf6' },
        { id: 'simple-disjunction', label: 'Simple Disjunction', color: '#0ea5e9' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 500, y: 300 },
      children: [
        { id: 'pi-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'PI is at least as succinct as MODS' }
      ]
    },
    {
      id: 'ip',
      name: 'IP',
      fullName: 'Prime Implicants',
      description: 'Representation by the set of prime implicants',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'false' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'true' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'prime-implicants', label: 'Prime Implicants', color: '#3b82f6' },
        { id: 'simple-conjunction', label: 'Simple Conjunction', color: '#14b8a6' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 650, y: 300 },
      children: [
        { id: 'ip-mods', target: 'mods', typeId: 'succinctness', label: '≤', description: 'IP is at least as succinct as MODS' }
      ]
    },
    {
      id: 'mods',
      name: 'MODS',
      fullName: 'Models',
      description: 'Representation by models (complete assignments)',
      properties: {
        queries: [
          { code: 'CO', label: 'Consistency', polytime: 'true' },
          { code: 'VA', label: 'Validity', polytime: 'true' },
          { code: 'CE', label: 'Clausal Entailment', polytime: 'true' },
          { code: 'IM', label: 'Implicant', polytime: 'true' },
          { code: 'EQ', label: 'Equivalence', polytime: 'true' },
          { code: 'SE', label: 'Sentential Entailment', polytime: 'true' },
          { code: 'CT', label: 'Model Counting', polytime: 'true' },
          { code: 'ME', label: 'Model Enumeration', polytime: 'true' }
        ],
        transformations: [
          { code: 'CD', label: 'Conditioning', polytime: 'true' },
          { code: 'FO', label: 'Forgetting', polytime: 'true' },
          { code: 'SFO', label: 'Singleton Forgetting', polytime: 'true' },
          { code: '∧C', label: 'Conjunction', polytime: 'true' },
          { code: '∧BC', label: 'Bounded Conjunction', polytime: 'true' },
          { code: '∨C', label: 'Disjunction', polytime: 'true' },
          { code: '∨BC', label: 'Bounded Disjunction', polytime: 'true' },
          { code: '¬C', label: 'Negation', polytime: 'true' }
        ]
      },
      tags: [
        { id: 'models', label: 'Models', color: '#eab308' }
      ],
      references: [
        { title: 'Knowledge Compilation Map (Darwiche & Marquis)', href: 'https://arxiv.org/pdf/1106.1819' }
      ],
      position: { x: 800, y: 300 }
    }
  ]
};

// Helper function for visualization filters
function createOperationVisualizer(
  code: string,
  type: 'query' | 'transformation'
): (language: KCLanguage) => KCLanguage {
  return (language: KCLanguage) => {
    const operations = type === 'query' ? language.properties.queries : language.properties.transformations;
    const operation = operations?.find(op => op.code === code);
    if (!operation) return language;
    
    const colorMap = { 'true': '🟢', 'false': '🔴', 'unknown': '🟡' };
    const icon = colorMap[operation.polytime];
    const note = operation.note ? '*' : '';
    const suffix = `\n${icon}${code}${note}`;
    
    return {
      ...language,
      visual: {
        ...language.visual,
        labelSuffix: (language.visual?.labelSuffix || '') + suffix
      }
    };
  };
}

// Predefined filters
export const predefinedFilters: LanguageFilter[] = [
  {
    id: 'has-decomposability',
    name: 'Decomposability',
    description: 'Languages with decomposability property',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'decomposability') ?? false) ? language : null;
    }
  },
  {
    id: 'has-determinism',
    name: 'Determinism',
    description: 'Languages with determinism property',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'determinism') ?? false) ? language : null;
    }
  },
  {
    id: 'decision-diagrams',
    name: 'Decision Diagrams',
    description: 'Languages in the decision diagram family',
    category: 'filter by property',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: (language: KCLanguage) => {
      return (language.tags?.some(tag => tag.id === 'decision') ?? false) ? language : null;
    }
  },
  // Visualization filters for queries
  {
    id: 'visualize-co',
    name: 'Consistency (CO)',
    description: 'Display Consistency (CO) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CO', 'query')
  },
  {
    id: 'visualize-va',
    name: 'Validity (VA)',
    description: 'Display Validity (VA) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('VA', 'query')
  },
  {
    id: 'visualize-ce',
    name: 'Clausal Entailment (CE)',
    description: 'Display Clausal Entailment (CE) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CE', 'query')
  },
  {
    id: 'visualize-ct',
    name: 'Model Counting (CT)',
    description: 'Display Model Counting (CT) status on nodes',
    category: 'Visualize Queries',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CT', 'query')
  },
  // Visualization filters for transformations
  {
    id: 'visualize-cd',
    name: 'Conditioning (CD)',
    description: 'Display Conditioning (CD) status on nodes',
    category: 'Visualize Transformations',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('CD', 'transformation')
  },
  {
    id: 'visualize-fo',
    name: 'Forgetting (FO)',
    description: 'Display Forgetting (FO) status on nodes',
    category: 'Visualize Transformations',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('FO', 'transformation')
  },
  {
    id: 'visualize-conjunction',
    name: 'Conjunction (∧C)',
    description: 'Display Conjunction (∧C) status on nodes',
    category: 'Visualize Transformations',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('∧C', 'transformation')
  },
  {
    id: 'visualize-negation',
    name: 'Negation (¬C)',
    description: 'Display Negation (¬C) status on nodes',
    category: 'Visualize Transformations',
    activeByDefault: false,
    controlType: 'checkbox',
    lambda: createOperationVisualizer('¬C', 'transformation')
  }
];

// Function to organize filters by category
export function organizeFiltersByCategory(filters: LanguageFilter[]): FilterCategory[] {
  const categorizedFilters = filters.filter(f => f.category);
  
  const categoryMap = new Map<string, LanguageFilter[]>();
  
  categorizedFilters.forEach(filter => {
    const categoryName = filter.category!;
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, []);
    }
    categoryMap.get(categoryName)!.push(filter);
  });
  
  const categories: FilterCategory[] = Array.from(categoryMap.entries()).map(([name, filters]) => ({
    name, // Use the original category name as-is
    filters
  }));
  
  return categories;
}