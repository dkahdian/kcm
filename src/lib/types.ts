// Types for the Knowledge Compilation Map

// flexible status for whether an operation is polytime
export type PolytimeFlag = 'true' | 'false' | 'unknown';

export interface KCOpEntry {
  /** short code, e.g., CO, VA, CE, IM, EQ, SU, CD, FO */
  code: string;
  /** human-friendly label, e.g., "Consistency" */
  label?: string;
  /** whether operation is known polynomial-time */
  polytime: PolytimeFlag;
  /** optional explanatory note, e.g., "Unless P=NP" */
  note?: string;
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
  properties: KCLanguageProperties;
  /** optional manual positioning for static layouts */
  position?: { x: number; y: number };
  /** ids of languages that are strict subsets of this one */
  subsets?: string[];
  /** badges/tags for quick categorization */
  tags?: KCTag[];
  /** list of external references for this language */
  references?: KCReference[];
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
  source: string;
  target: string;
  /** relation type id that determines semantics and styling */
  typeId: string;
  /** optional per-edge override label */
  label?: string;
  /** optional per-edge description */
  description?: string;
}

export interface GraphData {
  languages: KCLanguage[];
  relations: KCRelation[];
  /** catalog of relation types used by relations and legend */
  relationTypes: KCRelationType[];
}

// Filter system types
export interface LanguageFilter {
  id: string;
  name: string;
  description: string;
  category?: string;
  filterFn: (language: KCLanguage) => boolean;
}

export interface FilterCategory {
  name: string;
  filters: LanguageFilter[];
}

export interface FilteredGraphData extends GraphData {
  visibleLanguageIds: Set<string>;
  visibleRelations: KCRelation[];
}