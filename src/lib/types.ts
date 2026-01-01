// Types for the Knowledge Compilation Map

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
 * Full complexity info with display properties.
 * Used for both transformation statuses and operation complexities.
 * 
 * IMPORTANT: Always use the full Complexity object in the frontend,
 * never just the code string. This ensures consistent display.
 * 
 * Display contexts:
 * - notation: LaTeX notation for succinctness relations (f:languageA→languageB), e.g., "$\leq_p$"
 * - emoji: For query/transformation operations (f:any→any), e.g., "✓" or "✗"
 */
export interface Complexity {
  /** Internal code identifier */
  code: string;
  /**
   * True if this complexity code is generated only by filters/UI transforms
   * and should never be stored in canonical data or user-authored contributions.
   */
  internal?: boolean;
  /** Human-readable label (e.g., "Polynomial") */
  label: string;
  /** Short notation, supports LaTeX (e.g., "$\\leq_p$") - used for succinctness relations */
  notation: string;
  /** Emoji representation - used for query/transformation operations */
  emoji: string;
  /** Full description, supports LaTeX */
  description: string;
  /** CSS color value (saturated, for icons/text) */
  color: string;
  /** Pastel version of color (for backgrounds) */
  pastel: string;
  /** CSS class name for styling */
  cssClass: string;
  /** Arrow shape for graph edge endpoints */
  arrow: ArrowShape;
  /** Whether the arrow/edge should be dashed */
  dashed: boolean;
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
  /** complexity code (use getComplexity() to get full Complexity object for display) */
  complexity: string;
  /** optional explanatory note, e.g., "Unless P=NP" */
  note?: string;
  /** reference IDs pointing to entries in the language's references array */
  refs: string[];
}

/**
 * Full operation entry with all metadata, used for rendering.
 * Extends KCOpSupport with canonical operation info (code/label).
 */
export interface KCOpEntry extends KCOpSupport {
  /** short code, e.g., CO, VA, CE, IM, EQ, SU, CD, FO */
  code: string;
  /** human-friendly label, e.g., "Consistency" */
  label: string;
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
  /** Unique internal identifier (URL-safe, no special chars) */
  id: string;
  /** Display name (may contain LaTeX like OBDD$_<$) */
  name: string;
  fullName: string;
  description: string;
  /** reference IDs for the main description */
  descriptionRefs: string[];
  properties: KCLanguageProperties;
  /** names of languages that are strict subsets of this one */
  subsets?: string[];
  /** badges/tags for quick categorization */
  tags?: KCTag[];
  /** list of external references for this language */
  references: KCReference[];
  /** visual overrides applied by filters */
  visual?: VisualOverrides;
}

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
 * Canonical edge representation - each edge stored exactly once.
 * Edges are bidirectional with independent status in each direction.
 * 
 * Node ordering: nodeA and nodeB are ordered lexicographically (nodeA < nodeB)
 * to ensure canonical representation.
 */

/**
 * Separating function stored in top-level database array.
 * shortName serves as the unique identifier for referencing from relationships.
 */
export interface KCSeparatingFunction {
  /** Short label rendered directly on the edge (also serves as unique ID) */
  shortName: string;
  /** Full human-readable name */
  name: string;
  /** Description of what is separated */
  description: string;
  /** Supporting references */
  refs: string[];
}

/**
 * Description component for a single claim in a no-poly-quasi edge.
 * Used to track whether each half (no-poly / quasi-exists) was manually authored or derived.
 */
export interface DescriptionComponent {
  /** Description/justification for this claim */
  description: string;
  /** Supporting references */
  refs: string[];
  /** True if this part was inferred by the propagator */
  derived: boolean;
}

export interface DirectedSuccinctnessRelation {
  /** Transformation classification from source → target (use getComplexity() for display) */
  status: string;
  /** Optional descriptive note for this direction */
  description?: string;
  /** Supporting references */
  refs: string[];
  /** Separating function shortNames (references top-level separatingFunctions array by shortName) */
  separatingFunctionIds?: string[];
  /** Whether this edge is hidden by transitive reduction (always false by default) */
  hidden?: boolean;
  /** True if this edge was inferred by the propagator rather than manually authored. */
  derived?: boolean;
  /**
   * For no-poly-quasi edges: structured proof tracking for each claim.
   * Allows partial derivation where one claim is manual and the other derived.
   * When present, `derived` should be true only if BOTH proofs are derived.
   */
  noPolyDescription?: DescriptionComponent;
  quasiDescription?: DescriptionComponent;
  /** True if this edge should be visually dimmed/grayed (set by implicitEdgeTreatment filter). */
  dimmed?: boolean;
  /** True if this edge should be highlighted as explicit (set by implicitEdgeTreatment filter). */
  explicit?: boolean;
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
  languageIds: string[]; // Contains language IDs (unique internal identifiers)
  indexByLanguage: Record<string, number>; // Maps language ID to matrix index
  matrix: (DirectedSuccinctnessRelation | null)[][];
}

export interface GraphData {
  languages: KCLanguage[];
  /** Directed succinctness relationships stored as an adjacency matrix */
  adjacencyMatrix: KCAdjacencyMatrix;
  /** catalog of relation types used by relations and legend */
  relationTypes: KCRelationType[];
  /** catalog of complexity definitions used for rendering */
  complexities: Record<string, Complexity>;
  /** global registry of references used across the dataset */
  references: KCReference[];
  /** separating function registry */
  separatingFunctions: KCSeparatingFunction[];
  /** optional metadata copied from database.json */
  metadata?: Record<string, unknown>;
}

export interface TransformValidationResult {
  ok: boolean;
  errors?: string[];
}

// Filter system types
export type FilterControlType = 'checkbox' | 'toggle' | 'radio' | 'dropdown';
export type FilterParamValue = boolean | string | number;
export type ViewMode = 'graph' | 'matrix';

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
  /** Default value for the filter parameter (used for graph mode, or both if no matrix default) */
  defaultParam: T;
  /** Optional override default for matrix view mode */
  defaultParamMatrix?: T;
  /** UI control type for displaying this filter */
  controlType?: FilterControlType;
  /** Optional list of selectable options for dropdown-style filters */
  options?: FilterOption[];
  /** Filter function operating on the entire dataset */
  lambda: (data: GraphData, param: T) => GraphData;
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
  /** Default value for the filter parameter (used for graph mode, or both if no matrix default) */
  defaultParam: T;
  /** Optional override default for matrix view mode */
  defaultParamMatrix?: T;
  /** UI control type for displaying this filter */
  controlType?: FilterControlType;
  /** Optional list of selectable options for dropdown-style filters */
  options?: FilterOption[];
  /** Filter function operating on the entire dataset */
  lambda: (data: GraphData, param: T) => GraphData;
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
