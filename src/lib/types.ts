// Types for the Knowledge Compilation Map
export interface KCLanguage {
  id: string;
  name: string;
  fullName: string;
  description: string;
  properties: {
    // Queries
    CO: boolean; // Consistency
    VA: boolean; // Validity 
    CE: boolean; // Clausal entailment
    IM: boolean; // Implicant
    EQ: boolean; // Equivalence
    // Transformations  
    SU: boolean; // Sentential conditioning
    CD: boolean; // Conjunction
    FO: boolean; // Forgetting
    // Other properties
    polySizeTransformations?: string[];
    exponentialTransformations?: string[];
  };
  position?: { x: number; y: number };
}

export interface KCRelation {
  id: string;
  source: string;
  target: string;
  type: 'succinctness' | 'equivalence' | 'incomparable';
  label?: string;
  description?: string;
}

export interface GraphData {
  languages: KCLanguage[];
  relations: KCRelation[];
}