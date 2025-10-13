// Types for the Knowledge Compilation Map

/**
 * Code identifying a polytime complexity status.
 */
export type PolytimeFlagCode = 'true' | 'false' | 'unknown' | 'open';

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
  /** optional manual positioning for static layouts */
  position?: { x: number; y: number };
  /** ids of languages that are strict subsets of this one */
  subsets?: string[];
  /** badges/tags for quick categorization */
  tags?: KCTag[];
  /** list of external references for this language */
  references: KCReference[];
  /** visual overrides applied by filters */
  visual?: VisualOverrides;
  /** all relationships (edges) to/from this language - full adjacency representation */
  relationships?: KCRelation[];
}

export interface KCRelationTypeStyle {
  lineColor?: string; // CSS color
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  width?: number; // pixels
  targetArrow?: 'none' | 'triangle' | 'vee' | 'triangle-backcurve';
}

/**
 * Defines a visual/semantic type of relation (edge) with styling
 * and information used across edges and in legend.
 */
export interface KCRelationType {
  /** unique id used to reference this type from relations */
  id: string;
  /** display name, e.g., "Succinctness" */
  name: string;
  /** optional short glyph/symbol, e.g., "≤", "≡", "∥" */
  label?: string;
  /** optional description shown in legend/tooltips */
  description?: string;
  /** default style for edges of this type */
  style?: KCRelationTypeStyle;
  /** whether this relation type is shown by default in the graph */
  defaultVisible?: boolean;
}

export interface KCRelation {
  id: string;
  /** target language id (source is implicit - the parent node) */
  target: string;
  /** relation type id that determines semantics and styling */
  typeId: string;
  /** optional per-edge override label */
  label?: string;
  /** optional per-edge description */
  description?: string;
  /** reference IDs pointing to entries in the parent language's references array */
  refs: string[];
}

export interface GraphData {
  languages: KCLanguage[];
  /** catalog of relation types used by relations and legend */
  relationTypes: KCRelationType[];
}

// Filter system types
export type FilterControlType = 'checkbox' | 'toggle' | 'radio' | 'dropdown';
export type FilterParamValue = boolean | string | number;

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
  /** Filter function: takes language and parameter value, returns modified language to show it, or null to hide it */
  lambda: (language: KCLanguage, param: T) => KCLanguage | null;
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