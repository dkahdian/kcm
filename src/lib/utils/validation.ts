import type { ContributionSubmission, EdgeRelationshipInput, OperationSupportInput, TagInput } from '$lib/contribution-types.js';
import { QUERIES, TRANSFORMATIONS } from '$lib/data/operations.js';
import { POLYTIME_COMPLEXITIES } from '$lib/data/polytime-complexities.js';
import type { PolytimeFlagCode, TransformationStatus } from '$lib/types.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const TRANSFORMATION_STATUS_VALUES: TransformationStatus[] = [
  'poly',
  'no-poly-unknown-quasi',
  'no-poly-quasi',
  'unknown-poly-quasi',
  'unknown-both',
  'no-quasi'
];

const PLACEHOLDER_REF_REGEX = /^new-\d+$/;

export function isPlaceholderReference(id: string): boolean {
  return PLACEHOLDER_REF_REGEX.test(id);
}

export function validateLanguageId(id: string): ValidationError | null {
  if (!id || id.trim().length === 0) {
    return { field: 'languageData.id', message: 'Language ID is required' };
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    return {
      field: 'languageData.id',
      message: 'Language ID must contain only lowercase letters, numbers, and hyphens'
    };
  }

  if (id.startsWith('-') || id.endsWith('-')) {
    return {
      field: 'languageData.id',
      message: 'Language ID cannot start or end with a hyphen'
    };
  }

  if (id.includes('--')) {
    return {
      field: 'languageData.id',
      message: 'Language ID cannot contain consecutive hyphens'
    };
  }

  return null;
}

export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function validateEmail(email: string): ValidationError | null {
  if (!email || email.trim().length === 0) {
    return { field: 'contributorEmail', message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'contributorEmail', message: 'Invalid email format' };
  }

  return null;
}

export function validateGitHubUsername(username: string | undefined): ValidationError | null {
  if (!username) {
    return null;
  }

  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
    return { field: 'contributorGithub', message: 'Invalid GitHub username format' };
  }

  return null;
}

export function extractCitationKey(bibtex: string): string | null {
  const match = bibtex.match(/@\w+\{([^,\s]+)/);
  return match ? match[1] : null;
}

export function validateBibtex(bibtex: string, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!bibtex || bibtex.trim().length === 0) {
    errors.push({ field: `newReferences[${index}]`, message: 'BibTeX entry is required' });
    return errors;
  }

  if (!bibtex.match(/@\w+\{/)) {
    errors.push({ field: `newReferences[${index}]`, message: 'Invalid BibTeX format: missing @type{' });
  }

  const key = extractCitationKey(bibtex);
  if (!key) {
    errors.push({ field: `newReferences[${index}]`, message: 'Could not extract citation key from BibTeX' });
  }

  const hasTitle = /title\s*=\s*\{[^}]+\}/i.test(bibtex);
  const hasAuthor = /author\s*=\s*\{[^}]+\}/i.test(bibtex);
  const hasYear = /year\s*=\s*\{?\d{4}\}?/i.test(bibtex);

  if (!hasTitle) {
    errors.push({ field: `newReferences[${index}]`, message: 'BibTeX entry missing title field' });
  }

  if (!hasAuthor) {
    errors.push({ field: `newReferences[${index}]`, message: 'BibTeX entry missing author field' });
  }

  if (!hasYear) {
    errors.push({ field: `newReferences[${index}]`, message: 'BibTeX entry missing year field' });
  }

  return errors;
}

function validateOperationSupport(
  supportMap: Record<string, OperationSupportInput>,
  validOps: Set<string>,
  fieldPrefix: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [code, support] of Object.entries(supportMap)) {
    if (!validOps.has(code)) {
      errors.push({ field: `${fieldPrefix}.${code}`, message: 'Unknown operation code' });
      continue;
    }

    if (!support.polytime) {
      errors.push({ field: `${fieldPrefix}.${code}.polytime`, message: 'Polytime flag is required' });
    } else if (!POLYTIME_COMPLEXITIES[support.polytime]) {
      errors.push({ field: `${fieldPrefix}.${code}.polytime`, message: 'Invalid polytime flag' });
    }

    if (!Array.isArray(support.refs) || support.refs.length === 0) {
      errors.push({ field: `${fieldPrefix}.${code}.refs`, message: 'At least one reference is required' });
    } else {
      for (const ref of support.refs) {
        if (!isPlaceholderReference(ref) && !ref.trim()) {
          errors.push({ field: `${fieldPrefix}.${code}.refs`, message: 'Reference IDs must be provided' });
          break;
        }
      }
    }
  }

  return errors;
}

function validateTags(tags: TagInput[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < tags.length; i += 1) {
    const tag = tags[i];
    const prefix = `languageData.tags[${i}]`;

    if (!tag.id || !tag.id.trim()) {
      errors.push({ field: `${prefix}.id`, message: 'Tag ID is required' });
    } else if (seenIds.has(tag.id)) {
      errors.push({ field: `${prefix}.id`, message: 'Duplicate tag ID' });
    } else {
      seenIds.add(tag.id);
    }

    if (!tag.label || !tag.label.trim()) {
      errors.push({ field: `${prefix}.label`, message: 'Tag label is required' });
    }

    if (!Array.isArray(tag.refs)) {
      errors.push({ field: `${prefix}.refs`, message: 'Tag references must be an array' });
    } else if (tag.refs.some((ref) => !isPlaceholderReference(ref) && !ref.trim())) {
      errors.push({ field: `${prefix}.refs`, message: 'Tag references must be valid IDs' });
    }
  }

  return errors;
}

function validateRelationships(
  relationships: EdgeRelationshipInput[],
  options: {
    existingLanguageIds: string[];
  }
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { existingLanguageIds } = options;
  const validIds = new Set(existingLanguageIds);

  for (let i = 0; i < relationships.length; i += 1) {
    const rel = relationships[i];
    const prefix = `relationships[${i}]`;

    if (!rel.sourceId || !rel.sourceId.trim()) {
      errors.push({ field: `${prefix}.sourceId`, message: 'Source language is required' });
      continue;
    }

    if (!rel.targetId || !rel.targetId.trim()) {
      errors.push({ field: `${prefix}.targetId`, message: 'Target language is required' });
      continue;
    }

    if (rel.sourceId === rel.targetId) {
      errors.push({ field: `${prefix}.targetId`, message: 'Source and target languages must be different' });
    }

    if (!validIds.has(rel.sourceId)) {
      errors.push({ field: `${prefix}.sourceId`, message: 'Unknown source language' });
    }

    if (!validIds.has(rel.targetId)) {
      errors.push({ field: `${prefix}.targetId`, message: 'Unknown target language' });
    }

    if (!TRANSFORMATION_STATUS_VALUES.includes(rel.status)) {
      errors.push({ field: `${prefix}.status`, message: 'Invalid relationship status' });
    }

    if (!Array.isArray(rel.refs) || rel.refs.length === 0) {
      errors.push({ field: `${prefix}.refs`, message: 'At least one reference is required for relationships' });
    } else {
      for (const ref of rel.refs) {
        if (!isPlaceholderReference(ref) && !ref.trim()) {
          errors.push({ field: `${prefix}.refs`, message: 'Relationship references must be valid IDs' });
          break;
        }
      }
    }

    // Validate separating functions if present
    if (rel.separatingFunctions && Array.isArray(rel.separatingFunctions)) {
      const seenShortNames = new Set<string>();
      
      for (let j = 0; j < rel.separatingFunctions.length; j += 1) {
        const fn = rel.separatingFunctions[j];
        const fnPrefix = `${prefix}.separatingFunctions[${j}]`;

        if (!fn.shortName || !fn.shortName.trim()) {
          errors.push({ field: `${fnPrefix}.shortName`, message: 'Separating function short name is required' });
        } else if (seenShortNames.has(fn.shortName)) {
          errors.push({ field: `${fnPrefix}.shortName`, message: 'Duplicate separating function short name' });
        } else {
          seenShortNames.add(fn.shortName);
        }

        if (!fn.name || !fn.name.trim()) {
          errors.push({ field: `${fnPrefix}.name`, message: 'Separating function name is required' });
        }

        if (!fn.description || !fn.description.trim()) {
          errors.push({ field: `${fnPrefix}.description`, message: 'Separating function description is required' });
        }

        if (!Array.isArray(fn.refs)) {
          errors.push({ field: `${fnPrefix}.refs`, message: 'Separating function references must be an array' });
        } else if (fn.refs.length === 0) {
          errors.push({ field: `${fnPrefix}.refs`, message: 'At least one reference is required for separating functions' });
        } else {
          for (const ref of fn.refs) {
            if (!isPlaceholderReference(ref) && !ref.trim()) {
              errors.push({ field: `${fnPrefix}.refs`, message: 'Separating function references must be valid IDs' });
              break;
            }
          }
        }
      }
    }
  }

  return errors;
}

export function validateContribution(submission: ContributionSubmission): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate contributor info
  const emailError = validateEmail(submission.contributorEmail);
  if (emailError) {
    errors.push(emailError);
  }

  const githubError = validateGitHubUsername(submission.contributorGithub);
  if (githubError) {
    errors.push(githubError);
  }

  // Must have at least one thing to contribute
  const hasLanguagesToAdd = submission.languagesToAdd.length > 0;
  const hasLanguagesToEdit = submission.languagesToEdit.length > 0;
  const hasRelationships = submission.relationships.length > 0;

  if (!hasLanguagesToAdd && !hasLanguagesToEdit && !hasRelationships) {
    errors.push({ 
      field: 'submission', 
      message: 'Must add at least one language, edit at least one language, or update at least one relationship' 
    });
  }

  // Build the set of all valid language IDs (existing + being added)
  const validLanguageIds = new Set(submission.existingLanguageIds);
  const addedLanguageIds = new Set<string>();

  // Validate languages to add
  submission.languagesToAdd.forEach((language, index) => {
    const prefix = `languagesToAdd[${index}]`;

    const idError = validateLanguageId(language.id);
    if (idError) {
      errors.push({ ...idError, field: `${prefix}.id` });
    } else if (submission.existingLanguageIds.includes(language.id)) {
      errors.push({ field: `${prefix}.id`, message: 'Language ID already exists' });
    } else if (addedLanguageIds.has(language.id)) {
      errors.push({ field: `${prefix}.id`, message: 'Duplicate language ID in this submission' });
    } else {
      addedLanguageIds.add(language.id);
      validLanguageIds.add(language.id);
    }

    if (!language.name || !language.name.trim()) {
      errors.push({ field: `${prefix}.name`, message: 'Language name is required' });
    }

    if (!language.fullName || !language.fullName.trim()) {
      errors.push({ field: `${prefix}.fullName`, message: 'Full name is required' });
    }

    if (!language.description || !language.description.trim()) {
      errors.push({ field: `${prefix}.description`, message: 'Description is required' });
    }

    if (!Array.isArray(language.descriptionRefs) || language.descriptionRefs.length === 0) {
      errors.push({ field: `${prefix}.descriptionRefs`, message: 'At least one description reference is required' });
    }

    const queryCodes = new Set(Object.keys(QUERIES));
    const transformationCodes = new Set(Object.keys(TRANSFORMATIONS));

    errors.push(
      ...validateOperationSupport(language.properties.queries, queryCodes, `${prefix}.properties.queries`)
    );
    errors.push(
      ...validateOperationSupport(language.properties.transformations, transformationCodes, `${prefix}.properties.transformations`)
    );

    errors.push(...validateTags(language.tags).map(err => ({ ...err, field: `${prefix}.${err.field}` })));

    if (!Array.isArray(language.existingReferences)) {
      errors.push({ field: `${prefix}.existingReferences`, message: 'Existing references must be an array' });
    }
  });

  // Validate languages to edit
  submission.languagesToEdit.forEach((language, index) => {
    const prefix = `languagesToEdit[${index}]`;

    const idError = validateLanguageId(language.id);
    if (idError) {
      errors.push({ ...idError, field: `${prefix}.id` });
    } else if (!submission.existingLanguageIds.includes(language.id)) {
      errors.push({ field: `${prefix}.id`, message: 'Cannot edit non-existent language' });
    }

    if (!language.name || !language.name.trim()) {
      errors.push({ field: `${prefix}.name`, message: 'Language name is required' });
    }

    if (!language.fullName || !language.fullName.trim()) {
      errors.push({ field: `${prefix}.fullName`, message: 'Full name is required' });
    }

    if (!language.description || !language.description.trim()) {
      errors.push({ field: `${prefix}.description`, message: 'Description is required' });
    }

    if (!Array.isArray(language.descriptionRefs) || language.descriptionRefs.length === 0) {
      errors.push({ field: `${prefix}.descriptionRefs`, message: 'At least one description reference is required' });
    }

    const queryCodes = new Set(Object.keys(QUERIES));
    const transformationCodes = new Set(Object.keys(TRANSFORMATIONS));

    errors.push(
      ...validateOperationSupport(language.properties.queries, queryCodes, `${prefix}.properties.queries`)
    );
    errors.push(
      ...validateOperationSupport(language.properties.transformations, transformationCodes, `${prefix}.properties.transformations`)
    );

    errors.push(...validateTags(language.tags).map(err => ({ ...err, field: `${prefix}.${err.field}` })));

    if (!Array.isArray(language.existingReferences)) {
      errors.push({ field: `${prefix}.existingReferences`, message: 'Existing references must be an array' });
    }
  });

  // Validate relationships (can reference existing OR newly added languages)
  errors.push(
    ...validateRelationships(submission.relationships, {
      existingLanguageIds: Array.from(validLanguageIds)
    })
  );

  // Validate new references
  submission.newReferences.forEach((bibtex, index) => {
    errors.push(...validateBibtex(bibtex, index));
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
