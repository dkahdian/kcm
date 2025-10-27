import type { PolytimeFlagCode, TransformationStatus } from './types.js';

export interface OperationSupportInput {
  polytime: PolytimeFlagCode;
  note?: string;
  refs: string[];
}

export interface TagInput {
  id: string;
  label: string;
  color?: string;
  description?: string;
  refs: string[];
}

export interface SeparatingFunctionInput {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
}

export interface LanguageFormInput {
  id: string;
  name: string;
  fullName: string;
  description: string;
  descriptionRefs: string[];
  properties: {
    queries: Record<string, OperationSupportInput>;
    transformations: Record<string, OperationSupportInput>;
  };
  tags: TagInput[];
  existingReferences: string[];
}

export interface EdgeRelationshipInput {
  sourceId: string;
  targetId: string;
  status: TransformationStatus;
  refs: string[];
  separatingFunctions?: SeparatingFunctionInput[];
}

export interface ContributionSubmission {
  contributorEmail: string;
  contributorGithub?: string;
  languagesToAdd: LanguageFormInput[];
  languagesToEdit: LanguageFormInput[];
  relationships: EdgeRelationshipInput[];
  newReferences: string[];
  existingLanguageIds: string[];
}
