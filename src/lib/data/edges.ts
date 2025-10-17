import type { CanonicalEdge } from '../types.js';

/**
 * Canonical edge registry - single source of truth for all graph edges.
 * 
 * Each edge is stored exactly once with both directions specified.
 * Nodes are ordered lexicographically (nodeA < nodeB) for canonical representation.
 * 
 * Edge orientation rules for layout:
 * - If aToB is 'poly' and bToA is not: A should be below B (arrow points up)
 * - If both are 'poly': bidirectional arrow (A ↔ B)
 * - Otherwise: layout algorithm determines positioning
 */
export const edges: CanonicalEdge[] = [
  // CNF relationships
  {
    id: 'cnf-dnnf',
    nodeA: 'cnf',
    nodeB: 'dnnf',
    aToB: 'poly',           // CNF → DNNF (polytime, filled triangle)
    bToA: 'no-quasi',       // DNNF → CNF (exponential gap, filled square)
    description: 'CNF compiles to DNNF in polytime; reverse is exponential',
    refs: ['Darwiche_2002']
  },
  {
    id: 'cnf-dnf',
    nodeA: 'cnf',
    nodeB: 'dnf',
    aToB: 'no-poly-unknown-quasi',  // CNF → DNF (no poly, quasi unknown, hollow tee)
    bToA: 'no-poly-unknown-quasi',  // DNF → CNF (same)
    description: 'Both conversions lack polynomial algorithms',
    refs: ['Darwiche_2002']
  },
  {
    id: 'cnf-nnf',
    nodeA: 'cnf',
    nodeB: 'nnf',
    aToB: 'poly',           // CNF → NNF (polytime)
    bToA: 'no-poly-quasi',  // NNF → CNF (quasipoly only, filled tee)
    description: 'CNF is subset of NNF; reverse is quasipoly',
    refs: ['Darwiche_2002']
  },

  // D-DNNF relationships
  {
    id: 'd-dnnf-dnnf',
    nodeA: 'd-dnnf',
    nodeB: 'dnnf',
    aToB: 'poly',           // d-DNNF → DNNF (polytime)
    bToA: 'poly',           // DNNF → d-DNNF (polytime, bidirectional)
    description: 'Deterministic DNNF is equivalent to DNNF',
    refs: ['Darwiche_2002']
  },
  {
    id: 'd-dnnf-dnf',
    nodeA: 'd-dnnf',
    nodeB: 'dnf',
    aToB: 'unknown-poly-quasi',  // d-DNNF → DNF (has quasi, poly unknown, hollow triangle-cross)
    bToA: 'no-quasi',            // DNF → d-DNNF (exponential gap)
    description: 'Quasi algorithm exists one way; exponential barrier reverse',
    refs: ['Darwiche_2002']
  },
  {
    id: 'd-dnnf-pi',
    nodeA: 'd-dnnf',
    nodeB: 'pi',
    aToB: 'no-poly-quasi',  // d-DNNF → PI (quasipoly only)
    bToA: 'poly',           // PI → d-DNNF (polytime)
    description: 'PI converts efficiently to d-DNNF',
    refs: ['Darwiche_2002']
  },

  // DNNF relationships  
  {
    id: 'dnnf-dnf',
    nodeA: 'dnnf',
    nodeB: 'dnf',
    aToB: 'unknown-both',   // DNNF → DNF (both unknown, hollow square)
    bToA: 'unknown-both',   // DNF → DNNF (both unknown)
    description: 'Complexity unknown in both directions',
    refs: ['Darwiche_2002']
  },
  {
    id: 'dnnf-nnf',
    nodeA: 'dnnf',
    nodeB: 'nnf',
    aToB: 'poly',           // DNNF → NNF (polytime)
    bToA: 'no-quasi',       // NNF → DNNF (exponential gap)
    description: 'DNNF is subset of NNF; reverse is hard',
    refs: ['Darwiche_2002']
  },
  {
    id: 'dnnf-fbdd',
    nodeA: 'dnnf',
    nodeB: 'fbdd',
    aToB: 'no-poly-unknown-quasi',  // DNNF → FBDD (no poly, quasi unknown)
    bToA: 'poly',                   // FBDD → DNNF (polytime)
    description: 'FBDD converts efficiently to DNNF',
    refs: ['Darwiche_2002']
  },

  // DNF relationships
  {
    id: 'dnf-nnf',
    nodeA: 'dnf',
    nodeB: 'nnf',
    aToB: 'poly',               // DNF → NNF (polytime)
    bToA: 'unknown-poly-quasi', // NNF → DNF (has quasi, poly unknown)
    description: 'DNF is subset of NNF; reverse has quasi algorithm',
    refs: ['Darwiche_2002']
  },
  {
    id: 'dnf-ip',
    nodeA: 'dnf',
    nodeB: 'ip',
    aToB: 'no-quasi',       // DNF → IP (exponential gap)
    bToA: 'poly',           // IP → DNF (polytime)
    description: 'IP converts efficiently to DNF',
    refs: ['Darwiche_2002']
  },

  // FBDD relationships
  {
    id: 'fbdd-obdd',
    nodeA: 'fbdd',
    nodeB: 'obdd',
    aToB: 'poly',           // FBDD → OBDD (polytime)
    bToA: 'poly',           // OBDD → FBDD (polytime, bidirectional)
    description: 'Free BDD and Ordered BDD are equivalent',
    refs: ['Darwiche_2002']
  },
  {
    id: 'fbdd-nnf',
    nodeA: 'fbdd',
    nodeB: 'nnf',
    aToB: 'poly',               // FBDD → NNF (polytime)
    bToA: 'no-poly-quasi',      // NNF → FBDD (quasipoly only)
    description: 'FBDD converts efficiently to NNF',
    refs: ['Darwiche_2002']
  },

  // IP relationships
  {
    id: 'ip-pi',
    nodeA: 'ip',
    nodeB: 'pi',
    aToB: 'unknown-both',   // IP → PI (both unknown)
    bToA: 'unknown-both',   // PI → IP (both unknown)
    description: 'Relationship between IP and PI unclear',
    refs: ['Darwiche_2002']
  },
  {
    id: 'ip-nnf',
    nodeA: 'ip',
    nodeB: 'nnf',
    aToB: 'poly',                   // IP → NNF (polytime)
    bToA: 'no-poly-unknown-quasi',  // NNF → IP (no poly, quasi unknown)
    description: 'IP converts to NNF easily',
    refs: ['Darwiche_2002']
  },

  // MODS relationships
  {
    id: 'mods-nnf',
    nodeA: 'mods',
    nodeB: 'nnf',
    aToB: 'poly',           // MODS → NNF (polytime)
    bToA: 'unknown-poly-quasi', // NNF → MODS (has quasi, poly unknown)
    description: 'MODS subset of NNF',
    refs: ['Darwiche_2002']
  },

  // NNF relationships (remaining)
  {
    id: 'f-nnf-nnf',
    nodeA: 'f-nnf',
    nodeB: 'nnf',
    aToB: 'poly',               // f-NNF → NNF (polytime)
    bToA: 'no-poly-quasi',      // NNF → f-NNF (quasipoly only)
    description: 'Flat NNF subset of NNF',
    refs: ['Darwiche_2002']
  },

  // OBDD relationships
  {
    id: 'obdd-obdd-lt',
    nodeA: 'obdd',
    nodeB: 'obdd-lt',
    aToB: 'poly',           // OBDD → OBDD<LT (polytime)
    bToA: 'poly',           // OBDD<LT → OBDD (polytime, bidirectional)
    description: 'OBDD with linear ordering equivalent to OBDD',
    refs: ['Darwiche_2002']
  },
  {
    id: 'obdd-pi',
    nodeA: 'obdd',
    nodeB: 'pi',
    aToB: 'no-poly-unknown-quasi',  // OBDD → PI (no poly, quasi unknown)
    bToA: 'unknown-poly-quasi',     // PI → OBDD (has quasi, poly unknown)
    description: 'Complex relationship between OBDD and PI',
    refs: ['Darwiche_2002']
  },

  // PI relationships
  {
    id: 'pi-sd-dnnf',
    nodeA: 'pi',
    nodeB: 'sd-dnnf',
    aToB: 'poly',           // PI → sd-DNNF (polytime)
    bToA: 'no-quasi',       // sd-DNNF → PI (exponential gap)
    description: 'PI converts to structured DNNF efficiently',
    refs: ['Darwiche_2002']
  },

  // S-NNF relationships
  {
    id: 's-nnf-nnf',
    nodeA: 's-nnf',
    nodeB: 'nnf',
    aToB: 'poly',           // s-NNF → NNF (polytime)
    bToA: 'no-poly-quasi',  // NNF → s-NNF (quasipoly only)
    description: 'Smooth NNF subset of NNF',
    refs: ['Darwiche_2002']
  },

  // SD-DNNF relationships
  {
    id: 'sd-dnnf-dnnf',
    nodeA: 'sd-dnnf',
    nodeB: 'dnnf',
    aToB: 'poly',           // sd-DNNF → DNNF (polytime)
    bToA: 'unknown-both',   // DNNF → sd-DNNF (both unknown)
    description: 'Structured DNNF subset of DNNF',
    refs: ['Darwiche_2002']
  }
];
