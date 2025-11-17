import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';

export type SeparatingFunctionEntry = {
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
  separatingFunctions?: SeparatingFunctionEntry[];
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
