// Types for the Knowledge Compilation Map

/**
 * Polytime complexity flag codes
 * - 'poly': polynomial time
 * - 'quasi': quasi-polynomial time
 * - 'exp': exponential time (proven)
 * - 'not-poly-conditional': not polynomial under assumption (e.g., 'Unless P=NP')
 * - 'unknown': complexity unknown
 * - 'open': open problem
 */
export type PolytimeFlagCode = 'poly' | 'quasi' | 'exp' | 'not-poly-conditional' | 'unknown' | 'open';

/**
 * Full polytime complexity flag with display properties.
 */
export interface PolytimeFlag {
  /** Short code identifier */
  code: PolytimeFlagCode;
  /** Full human-readable label */
  label: string;
  /** CSS color value (future: could be icon filename) */
  color: string;
  /** Emoji icon for text display */
  emoji: string;
  /** Optional description for tooltips */
  description?: string;
}

export interface VisualOverrides {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  labelPrefix?: string;
  labelSuffix?: string;
  highlightLevel?: 'none' | 'subtle' | 'strong';
}

/**
 * Language-specific support information for an operation.
 * The operation code and label come from the canonical operations definition.
 */
export interface KCOpSupport {
  /** polytime complexity code */
  polytime: PolytimeFlagCode;
  /** optional explanatory note, e.g., "Unless P=NP" */
  note?: string;
  /** reference IDs pointing to entries in the language's references array */
  refs: string[];
}

/**
 * Full operation entry with all metadata, used for rendering.
 * Combines canonical operation info with language-specific support info.
 */
export interface KCOpEntry {
  /** short code, e.g., CO, VA, CE, IM, EQ, SU, CD, FO */
  code: string;
  /** human-friendly label, e.g., "Consistency" */
  label: string;
  /** polytime complexity code */
  polytime: PolytimeFlagCode;
  /** optional explanatory note, e.g., "Unless P=NP" */
  note?: string;
  /** optional visual hint for highlighting this operation */
  visualHint?: 'highlight' | 'dim' | 'normal';
  /** optional color override for this operation's status indicator */
  colorOverride?: string;
  /** reference IDs pointing to entries in the language's references array */
  refs: string[];
}

/**
 * Language-specific operation support, keyed by operation code.
 */
export interface KCOpSupportMap {
  [opCode: string]: KCOpSupport;
}

export interface KCLanguageProperties {
  /** map of query operation codes to their support info */
  queries?: KCOpSupportMap;
  /** map of transformation operation codes to their support info */
  transformations?: KCOpSupportMap;
}

/**
 * Resolved language properties with full operation entries for rendering.
 */
export interface KCLanguagePropertiesResolved {
  /** list of query operations for this language */
  queries: KCOpEntry[];
  /** list of transformation operations for this language */
  transformations: KCOpEntry[];
}

export interface KCTag {
  id: string;
  label: string;
  color?: string; // CSS color for badge
  description?: string;
  /** reference IDs pointing to entries in the language's references array */
  refs: string[];
}

export interface KCReference {
  id: string;
  title: string;
  href: string;
  bibtex: string;
}

export interface KCLanguage {
  id: string;
  name: string;
  fullName: string;
  description: string;
  /** reference IDs for the main description */
  descriptionRefs: string[];
  properties: KCLanguageProperties;
  /** ids of languages that are strict subsets of this one */
  subsets?: string[];
  /** badges/tags for quick categorization */
  tags?: KCTag[];
  /** list of external references for this language */
  references: KCReference[];
  /** visual overrides applied by filters */
  visual?: VisualOverrides;
}

/**
 * Arrow shape types for relation endpoints
 */
export type ArrowShape = 
  | 'none'           // no arrow
  | 'triangle'       // solid triangle (standard arrow)
  | 'triangle-tee'   // triangle with perpendicular line
  | 'triangle-cross' // triangle with cross
  | 'tee'            // perpendicular line only
  | 'diamond'        // hollow diamond
  | 'square'         // square
  | 'circle'         // circle
  | 'vee'            // V-shaped arrow
  | 'chevron'        // chevron arrow
  | 'triangle-backcurve'; // curved triangle

/**
 * Style configuration for a single endpoint of an edge
 */
export interface EdgeEndpointStyle {
  /** Arrow shape at this endpoint */
  arrow: ArrowShape;
  /** Whether the arrow is dashed (for uncertainty) */
  dashed?: boolean;
  /** Whether to render as double parallel lines (for no-quasi relationships) */
  isDouble?: boolean;
  /** Color override for this endpoint */
  color?: string;
}

export interface KCRelationTypeStyle {
  lineColor?: string; // CSS color
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  width?: number; // pixels
  /** Style for the target (head) end of the edge */
  targetStyle?: EdgeEndpointStyle;
  /** Style for the source (tail) end of the edge */
  sourceStyle?: EdgeEndpointStyle;
  // Legacy single arrow support (deprecated - use targetStyle/sourceStyle instead)
  targetArrow?: 'none' | 'triangle' | 'vee' | 'triangle-backcurve';
}

/**
 * Defines a visual/semantic type of relation (edge) with styling
 * and information used across edges and in legend.
 */
export interface KCRelationType {
  /** unique id used to reference this type from relations */
  id: string;
  /** display name, e.g., "Polynomial Transformation" */
  name: string;
  /** optional short glyph/symbol, e.g., "≤_p", "≤_q" */
  label?: string;
  /** optional description shown in legend/tooltips */
  description?: string;
  /** default style for edges of this type */
  style?: KCRelationTypeStyle;
  /** whether this relation type is shown by default in the graph */
  defaultVisible?: boolean;
}

/**
 * Relationship status between two languages (A -> B direction)
 */
export type TransformationStatus = 
  | 'poly'           // Polynomial transformation exists (A ≤_p B)
  | 'no-poly-unknown-quasi'  // No poly, unknown quasi (A ⊄_p B and A ?≤_q B)
  | 'no-poly-quasi'  // No poly, but quasi exists (A ⊄_p B and A ≤_q B)
  | 'unknown-poly-quasi' // Unknown poly, quasi exists (A ?≤_p B and A ≤_q B)
  | 'unknown-both'   // Both unknown (A ?≤_p B and A ?≤_q B)
  | 'no-quasi';      // No quasi-polynomial transformation (A ⊄_q B)

// TEMPORARY: Old flat edge format for contribution system (to be removed)
export interface CanonicalEdge {
  id: string;
  nodeA: string;
  nodeB: string;
  aToB: TransformationStatus;
  bToA: TransformationStatus;
  description?: string;
  refs: string[];
}

/**
 * Canonical edge representation - each edge stored exactly once.
 * Edges are bidirectional with independent status in each direction.
 * 
 * Node ordering: nodeA and nodeB are ordered lexicographically (nodeA < nodeB)
 * to ensure canonical representation.
 */
export interface SeparatingFunction {
  /** Short label rendered directly on the edge */
  shortName: string;
  /** Full human-readable name */
  name: string;
  /** Description of what is separated */
  description: string;
  /** Supporting references */
  refs: string[];
}

export interface DirectedSuccinctnessRelation {
  /** Transformation classification from source → target */
  status: TransformationStatus;
  /** Optional descriptive note for this direction */
  description?: string;
  /** Supporting references */
  refs: string[];
  /** Separating functions that witness this direction */
  separatingFunctions: SeparatingFunction[];
  /** Whether this edge is hidden by transitive reduction (always false by default) */
  hidden?: boolean;
}

/**
 * Edge selection information for UI display
 */
export interface SelectedEdge {
  /** Edge identifier */
  id: string;
  /** Source language ID */
  source: string;
  /** Target language ID */
  target: string;
  /** Source language name */
  sourceName: string;
  /** Target language name */
  targetName: string;
  /** Forward direction relation (source → target) */
  forward: DirectedSuccinctnessRelation | null;
  /** Backward direction relation (target → source) */
  backward: DirectedSuccinctnessRelation | null;
  /** Combined references from both directions */
  refs: string[];
}

export interface KCAdjacencyMatrix {
  languageIds: string[];
  indexByLanguage: Record<string, number>;
  matrix: (DirectedSuccinctnessRelation | null)[][];
}

export interface GraphData {
  languages: KCLanguage[];
  /** Directed succinctness relationships stored as an adjacency matrix */
  adjacencyMatrix: KCAdjacencyMatrix;
  /** catalog of relation types used by relations and legend */
  relationTypes: KCRelationType[];
}

// Filter system types
export type FilterControlType = 'checkbox' | 'toggle' | 'radio' | 'dropdown';
export type FilterParamValue = boolean | string | number;

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

export interface LanguageFilter<T extends FilterParamValue = boolean> {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** Whether this filter is internal/hidden from UI or can be edited by the user */
  hidden?: boolean;
  /** Default value for the filter parameter */
  defaultParam: T;
  /** UI control type for displaying this filter */
  controlType?: FilterControlType;
  /** Optional list of selectable options for dropdown-style filters */
  options?: FilterOption[];
  /** Filter function: takes language and parameter value, returns modified language to show it, or null to hide it */
  lambda: (language: KCLanguage, param: T) => KCLanguage | null;
}

/**
 * Edge filter - operates on edges after node filtering
 * Returns the edge to show it, or null to hide it
 */
export interface EdgeFilter<T extends FilterParamValue = boolean> {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** Whether this filter is internal/hidden from UI or can be edited by the user */
  hidden?: boolean;
  /** Default value for the filter parameter */
  defaultParam: T;
  /** UI control type for displaying this filter */
  controlType?: FilterControlType;
  /** Optional list of selectable options for dropdown-style filters */
  options?: FilterOption[];
  /** Filter function: takes edge relation and parameter value, returns relation to show it, or null to hide it */
  lambda: (
    relation: DirectedSuccinctnessRelation,
    sourceId: string,
    targetId: string,
    param: T
  ) => DirectedSuccinctnessRelation | null;
}

export interface FilterCategory {
  name: string;
  filters: LanguageFilter[];
}

/**
 * State for a single filter, including its current parameter value
 */
export interface FilterState<T extends FilterParamValue = FilterParamValue> {
  filterId: string;
  param: T;
}

/**
 * Map of filter IDs to their current parameter values
 */
export type FilterStateMap = Map<string, FilterParamValue>;

export interface FilteredGraphData extends GraphData {
  visibleLanguageIds: Set<string>;
  /** Set of visible edge IDs in format "sourceId->targetId" */
  visibleEdgeIds: Set<string>;
}

// TODO: Future enhancement - Filter Presets
// Allow users to save and load filter combinations for quick access
// This would be useful for commonly used filter sets
/*
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filterIds: string[];  // IDs of filters to activate together
}
*/

// Note: Filters are designed to be independent and commutative
// i.e., f(g(language)) = g(f(language)) for any filters f and g
// This property ensures filter order doesn't matter