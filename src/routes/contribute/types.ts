import type { ContributionQueueEntry } from '$lib/data/contribution-transforms.js';

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
  /** Complexity code (use getComplexity() for display) */
  status: string;
  description?: string;
  refs: string[];
  separatingFunctionIds?: string[]; // New format: array of shortNames
  separatingFunctions?: SeparatingFunctionEntry[]; // Deprecated: inline format
};

export type LanguageToAdd = {
  name: string;
  fullName: string;
  description: string;
  descriptionRefs: string[];
  queries: Record<string, { complexity: string; note?: string; refs: string[] }>;
  transformations: Record<string, { complexity: string; note?: string; refs: string[] }>;
  tags: Array<{ label: string; color: string; description?: string; refs: string[] }>;
  existingReferences: string[];
};

export type CustomTag = {
  label: string;
  color: string;
  description?: string;
  refs: string[];
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
  queueEntries?: ContributionQueueEntry[];
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
