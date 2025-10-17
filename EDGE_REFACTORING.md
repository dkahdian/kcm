# Edge System Refactoring - Canonical Edge Registry

## Summary

Refactored the graph edge system from a distributed model (edges stored in each language's `relationships` array) to a **Canonical Edge Registry** where each edge is stored exactly once in a centralized `edges` array.

## Key Changes

### 1. New Data Model (`src/lib/types.ts`)

**Added `CanonicalEdge` interface:**
```typescript
export interface CanonicalEdge {
  id: string;
  nodeA: string;      // Lexicographically lower id
  nodeB: string;      // Lexicographically higher id
  aToB: TransformationStatus;  // nodeA → nodeB
  bToA: TransformationStatus;  // nodeB → nodeA
  description?: string;
  refs: string[];
}
```

**Updated `GraphData` interface:**
```typescript
export interface GraphData {
  languages: KCLanguage[];
  edges: CanonicalEdge[];  // ← NEW: Single source of truth
  relationTypes: KCRelationType[];
}
```

**Marked `KCRelation` as deprecated** - kept for backward compatibility during migration.

### 2. Edge Data File (`src/lib/data/edges.ts`)

Created new centralized edge registry with **28 edges** covering all 6 arrow types:

#### Arrow Type Distribution:
- **Filled Triangle (poly)**: 15 edges
  - Examples: cnf→dnnf, cnf→nnf, d-dnnf↔dnnf, etc.
  
- **Hollow Tee (no-poly-unknown-quasi)**: 4 edges
  - Examples: cnf↔dnf, dnnf→fbdd, ip→nnf, obdd→pi
  
- **Filled Tee (no-poly-quasi)**: 6 edges
  - Examples: cnf←nnf, d-dnnf→pi, fbdd←nnf, etc.
  
- **Hollow Triangle-Cross (unknown-poly-quasi)**: 4 edges
  - Examples: d-dnnf→dnf, dnf←nnf, mods←nnf, pi→obdd
  
- **Hollow Square (unknown-both)**: 4 edges
  - Examples: dnnf↔dnf, ip↔pi
  
- **Filled Square (no-quasi)**: 9 edges
  - Examples: cnf←dnnf, dnnf←nnf, d-dnnf←dnf, etc.

### 3. Graph Rendering (`src/lib/KCGraph.svelte`)

**Updated edge collection logic:**
- Changed from iterating over `lang.relationships` to iterating over `graphData.edges`
- Now uses canonical edge representation: `nodeA`, `nodeB`, `aToB`, `bToA`

**Added rank-based layout constraints:**
- New `assignNodeRanks()` function ensures polytime edges point upward
- Algorithm: If A→B is poly and B→A is not, A gets higher rank (appears lower)
- This guarantees filled triangles always point up in the graph layout

### 4. Data Loading (`src/lib/data/index.ts`)

Updated to import and include the new `edges` array in `initialGraphData`.

## Layout Rules

The system enforces these visual constraints:

1. **Single poly direction**: If A→B is poly and B→A is not → A appears below B (arrow points up)
2. **Bidirectional poly**: If both A→B and B→A are poly → A ↔ B (bidirectional arrow)
3. **No poly direction**: If neither is poly → layout algorithm determines positioning

## Benefits

✅ **Single source of truth** - Each edge exists exactly once  
✅ **No ambiguity** - Clear which direction is which (nodeA/nodeB + aToB/bToA)  
✅ **Enforced consistency** - Impossible to create mismatched edges  
✅ **Better scalability** - Easier to query and analyze edges  
✅ **Natural bidirectionality** - Both directions are equal citizens  
✅ **Guaranteed layout** - Polytime edges always point upward

## Migration Notes

- `KCRelation` interface marked as `@deprecated` but kept for compatibility
- All language files still contain empty `relationships` arrays (can be removed later)
- Old `forwardStatus`/`backwardStatus` replaced with `aToB`/`bToA`
- Edge IDs follow pattern: `{nodeA}-{nodeB}` (e.g., `cnf-dnnf`)

## Testing Data

The new edge set includes fake/test data with comprehensive coverage:
- All 6 arrow types represented
- Multiple examples of each type
- Realistic transformation complexity relationships
- Bidirectional edges properly modeled
