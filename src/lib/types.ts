// Types for the Knowledge Compilation Map

// flexible status for whether an operation is polytime
export type PolytimeFlag = 'true' | 'false' | 'unknown';

export interface VisualOverrides {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  labelPrefix?: string;
  labelSuffix?: string;
  highlightLevel?: 'none' | 'subtle' | 'strong';
}

export interface KCOpEntry {
  /** short code, e.g., CO, VA, CE, IM, EQ, SU, CD, FO */
  code: string;
  /** human-friendly label, e.g., "Consistency" */
  label?: string;
  /** whether operation is known polynomial-time */
  polytime: PolytimeFlag;
  /** optional explanatory note, e.g., "Unless P=NP" */
  note?: string;
  /** optional visual hint for highlighting this operation */
  visualHint?: 'highlight' | 'dim' | 'normal';
  /** optional color override for this operation's status indicator */
  colorOverride?: string;
  /** reference indices into the language's references array (0-based, displayed as 1-based) */
  refs: number[];
}

export interface KCLanguageProperties {
  /** list of query operations for this language */
  queries?: KCOpEntry[];
  /** list of transformation operations for this language */
  transformations?: KCOpEntry[];
}

export interface KCTag {
  id: string;
  label: string;
  color?: string; // CSS color for badge
  description?: string;
  /** reference indices into the language's references array (0-based, displayed as 1-based) */
  refs: number[];
}

export interface KCReference {
  title: string;
  href: string;
}

export interface KCLanguage {
  id: string;
  name: string;
  fullName: string;
  description: string;
  /** reference indices for the main description (0-based, displayed as 1-based) */
  descriptionRefs: number[];
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
  /** outgoing edges (children) in the DAG */
  children?: KCRelation[];
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
  /** reference indices into the parent language's references array (0-based, displayed as 1-based) */
  refs: number[];
}

export interface GraphData {
  languages: KCLanguage[];
  /** catalog of relation types used by relations and legend */
  relationTypes: KCRelationType[];
}

// Filter system types
export type FilterControlType = 'checkbox' | 'toggle' | 'radio' | 'dropdown';

export interface LanguageFilter {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** Whether this filter should be active by default (true) or inactive (false) */
  activeByDefault?: boolean;
  /** UI control type for displaying this filter */
  controlType?: FilterControlType;
  /** Filter function: return modified language to show it, or null to hide it */
  lambda: (language: KCLanguage) => KCLanguage | null;
}

export interface FilterCategory {
  name: string;
  filters: LanguageFilter[];
}

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