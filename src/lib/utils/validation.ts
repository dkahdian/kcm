import type { ContributionSubmission, EdgeRelationshipInput, OperationSupportInput, TagInput } from '$lib/contribution-types.js';
import { QUERIES, TRANSFORMATIONS } from '$lib/data/operations.js';
import { COMPLEXITIES, isValidComplexityCode } from '$lib/data/complexities.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const TRANSFORMATION_STATUS_VALUES: string[] = [
  'poly',
  'no-poly-unknown-quasi',
  'no-poly-quasi',
  'unknown-poly-quasi',
  'unknown-both',
  'no-quasi',
  'not-poly'
];

const PLACEHOLDER_REF_REGEX = /^new-\d+$/;

export function isPlaceholderReference(id: string): boolean {
  return PLACEHOLDER_REF_REGEX.test(id);
}

export function validateLanguageName(name: string): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return { field: 'languageData.name', message: 'Language name is required' };
  }

  // Names can contain any characters except escape chars like \", \', \\
  // But we still want to prevent some problematic patterns
  if (name.includes('\\"') || name.includes("\\'") || name.includes('\\\\')) {
    return {
      field: 'languageData.name',
      message: 'Language name cannot contain escape characters'
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
      errors.push({ field: `${fieldPrefix}.${code}.polytime`, message: 'Complexity code is required' });
    } else if (!isValidComplexityCode(support.polytime)) {
      errors.push({ field: `${fieldPrefix}.${code}.polytime`, message: 'Invalid complexity code' });
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

    if (!tag.label || !tag.label.trim()) {
      errors.push({ field: `${prefix}.label`, message: 'Tag label is required' });
    } else if (seenIds.has(tag.label)) {
      errors.push({ field: `${prefix}.label`, message: 'Duplicate tag label' });
    } else {
      seenIds.add(tag.label);
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
  const hasNewReferences = submission.newReferences.length > 0;

  if (!hasLanguagesToAdd && !hasLanguagesToEdit && !hasRelationships && !hasNewReferences) {
    errors.push({ 
      field: 'submission', 
      message: 'Must add at least one item (language, reference, or relationship)' 
    });
  }

  // Build the set of all valid language IDs (existing + being added)
  const validLanguageIds = new Set(submission.existingLanguageIds);
  const addedLanguageIds = new Set<string>();

  // Validate languages to add
  submission.languagesToAdd.forEach((language, index) => {
    const prefix = `languagesToAdd[${index}]`;

    const nameError = validateLanguageName(language.name);
    if (nameError) {
      errors.push({ ...nameError, field: `${prefix}.name` });
    } else if (submission.existingLanguageIds.includes(language.name)) {
      errors.push({ field: `${prefix}.name`, message: 'Language name already exists' });
    } else if (addedLanguageIds.has(language.name)) {
      errors.push({ field: `${prefix}.name`, message: 'Duplicate language name in this submission' });
    } else {
      addedLanguageIds.add(language.name);
      validLanguageIds.add(language.name);
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
    // For transformations, accept both safe keys (AND_C) and display codes (∧C)
    const transformationCodes = new Set([
      ...Object.keys(TRANSFORMATIONS),
      ...Object.values(TRANSFORMATIONS).map(t => t.code)
    ]);

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

    const nameError = validateLanguageName(language.name);
    if (nameError) {
      errors.push({ ...nameError, field: `${prefix}.name` });
    } else if (!submission.existingLanguageIds.includes(language.name)) {
      errors.push({ field: `${prefix}.name`, message: 'Cannot edit non-existent language' });
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
    // For transformations, accept both safe keys (AND_C) and display codes (∧C)
    const transformationCodes = new Set([
      ...Object.keys(TRANSFORMATIONS),
      ...Object.values(TRANSFORMATIONS).map(t => t.code)
    ]);

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
