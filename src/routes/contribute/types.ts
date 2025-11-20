import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';

export type SeparatingFunctionEntry = {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
};

export type SeparatingFunctionToAdd = {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
};

export type RelationshipEntry = {
  sourceId: string;
  targetId: string;
  status: TransformationStatus;
  refs: string[];
  separatingFunctionIds?: string[]; // New format: array of shortNames
  separatingFunctions?: SeparatingFunctionEntry[]; // Deprecated: inline format
};

export type LanguageToAdd = {
  name: string;
  fullName: string;
  description: string;
  descriptionRefs: string[];
  queries: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
  transformations: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
  tags: Array<{ label: string; color: string; description?: string; refs: string[] }>;
  existingReferences: string[];
};

export type CustomTag = {
  label: string;
  color: string;
  description?: string;
  refs: string[];
};

export type DeferredItems = {
  languages: LanguageToAdd[];
  editedLanguages: LanguageToAdd[];
  references: string[];
  separatingFunctions: SeparatingFunctionToAdd[];
  relationships: RelationshipEntry[];
  tags: CustomTag[];
};

export type ContributorInfo = {
  email: string;
  github: string;
  note: string;
};

export type SubmissionHistoryPayload = {
  submissionId: string;
  supersedesSubmissionId?: string | null;
  languagesToAdd: LanguageToAdd[];
  languagesToEdit: LanguageToAdd[];
  relationships: RelationshipEntry[];
  newReferences: string[];
  newSeparatingFunctions: SeparatingFunctionToAdd[];
  customTags: CustomTag[];
  modifiedRelations: string[];
  contributor: ContributorInfo;
};

export type SubmissionHistoryEntry = {
  id: string;
  createdAt: string;
  summary: {
    languagesToAdd: number;
    languagesToEdit: number;
    relationships: number;
    newReferences: number;
  };
  payload: SubmissionHistoryPayload;
  supersedesSubmissionId?: string | null;
  supersededBySubmissionId?: string;
};
