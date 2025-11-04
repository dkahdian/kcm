import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ContributionSubmission, EdgeRelationshipInput, OperationSupportInput, TagInput } from '$lib/contribution-types.js';
import {
  validateContribution,
  extractCitationKey,
  isPlaceholderReference
} from '$lib/utils/validation.js';
import type { CanonicalEdge, PolytimeFlagCode, TransformationStatus } from '$lib/types.js';
import { edges as existingEdges } from '$lib/data/edges.js';
import { env } from '$env/dynamic/private';

interface OperationSupportPayload {
  polytime: PolytimeFlagCode;
  note?: string;
  refs: string[];
}

interface TagPayload extends Omit<TagInput, 'refs'> {
  refs: string[];
}

interface SeparatingFunctionPayload {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
}

interface DirectedRelationPayload {
  status: TransformationStatus;
  description?: string;
  refs: string[];
  separatingFunctions: SeparatingFunctionPayload[];
}

interface LanguagePayload {
  id: string;
  name: string;
  fullName: string;
  description: string;
  descriptionRefs: string[];
  properties: {
    queries: Record<string, OperationSupportPayload>;
    transformations: Record<string, OperationSupportPayload>;
  };
  tags: TagPayload[];
  references: string[];
}

interface EdgeUpdatePayload {
  edgeId: string;
  nodeA: string;
  nodeB: string;
  aToB: DirectedRelationPayload;
  bToA: DirectedRelationPayload;
}

interface ContributionPayload {
  languagesToAdd: Array<{
    slug: string;
    module: string;
    data: LanguagePayload;
  }>;
  languagesToEdit: Array<{
    slug: string;
    module: string;
    data: LanguagePayload;
  }>;
  newReferences: Array<{ citationKey: string; bibtex: string }>;
  edgeUpdates: EdgeUpdatePayload[];
  contributorEmail: string;
  contributorGithub?: string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count += 1;
  return true;
}

function toModuleIdentifier(slug: string): string {
  return slug
    .split('-')
    .map((segment, index) => (index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join('');
}

function mapReferences(refs: string[] | undefined, placeholderMap: Map<string, string>): string[] {
  if (!refs || refs.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  for (const ref of refs) {
    const trimmed = ref.trim();
    if (!trimmed) continue;

    if (isPlaceholderReference(trimmed)) {
      const actual = placeholderMap.get(trimmed);
      if (actual) {
        seen.add(actual);
      }
    } else {
      seen.add(trimmed);
    }
  }

  return Array.from(seen);
}

function normalizeOperationSupport(
  map: Record<string, OperationSupportInput>,
  placeholderMap: Map<string, string>,
  allReferences: Set<string>
): Record<string, OperationSupportPayload> {
  const result: Record<string, OperationSupportPayload> = {};

  for (const [code, support] of Object.entries(map)) {
    const refs = mapReferences(support.refs, placeholderMap);
    refs.forEach((ref) => allReferences.add(ref));

    result[code] = {
      polytime: support.polytime,
      note: support.note?.trim() || undefined,
      refs
    };
  }

  return result;
}

function normalizeTags(
  tags: TagInput[],
  placeholderMap: Map<string, string>,
  allReferences: Set<string>
): TagPayload[] {
  return tags.map((tag) => {
    const refs = mapReferences(tag.refs, placeholderMap);
    refs.forEach((ref) => allReferences.add(ref));

    return {
      id: tag.id.trim(),
      label: tag.label.trim(),
      color: tag.color?.trim() || undefined,
      description: tag.description?.trim() || undefined,
      refs
    };
  });
}

const canonicalEdgeMap: Map<string, CanonicalEdge> = new Map(
  existingEdges.map((edge) => [`${edge.nodeA}-${edge.nodeB}`, edge])
);

function normalizeRelationships(
  relationships: EdgeRelationshipInput[],
  placeholderMap: Map<string, string>,
  allReferences: Set<string>
): EdgeUpdatePayload[] {
  if (!relationships.length) {
    return [];
  }

  const updates = new Map<
    string,
    {
      nodeA: string;
      nodeB: string;
      aToB: DirectedRelationPayload;
      bToA: DirectedRelationPayload;
    }
  >();

  for (const rel of relationships) {
    const refs = mapReferences(rel.refs, placeholderMap);
    refs.forEach((ref) => allReferences.add(ref));

    // Process separating functions if present
    const separatingFunctions: SeparatingFunctionPayload[] = [];
    if (rel.separatingFunctions && Array.isArray(rel.separatingFunctions)) {
      for (const fn of rel.separatingFunctions) {
        const fnRefs = mapReferences(fn.refs, placeholderMap);
        fnRefs.forEach((ref) => allReferences.add(ref));
        
        separatingFunctions.push({
          shortName: fn.shortName.trim(),
          name: fn.name.trim(),
          description: fn.description.trim(),
          refs: fnRefs
        });
      }
    }

    const sourceId = rel.sourceId.trim();
    const targetId = rel.targetId.trim();
    const [nodeA, nodeB] = [sourceId, targetId].sort();
    const edgeKey = `${nodeA}-${nodeB}`;
    const existing = canonicalEdgeMap.get(edgeKey);

    let entry = updates.get(edgeKey);
    if (!entry) {
      // Initialize with existing data or defaults
      entry = {
        nodeA,
        nodeB,
        aToB: {
          status: existing ? existing.aToB : 'unknown-both',
          description: existing?.description,
          refs: existing?.refs ? [...existing.refs] : [],
          separatingFunctions: []
        },
        bToA: {
          status: existing ? existing.bToA : 'unknown-both',
          description: existing?.description,
          refs: existing?.refs ? [...existing.refs] : [],
          separatingFunctions: []
        }
      };
      updates.set(edgeKey, entry);
    }

    // Update the appropriate direction
    if (sourceId === nodeA) {
      entry.aToB = {
        status: rel.status,
        description: entry.aToB.description,
        refs: [...new Set([...entry.aToB.refs, ...refs])],
        separatingFunctions
      };
    } else {
      entry.bToA = {
        status: rel.status,
        description: entry.bToA.description,
        refs: [...new Set([...entry.bToA.refs, ...refs])],
        separatingFunctions
      };
    }
  }

  return Array.from(updates.entries()).map(([edgeKey, entry]) => ({
    edgeId: edgeKey,
    nodeA: entry.nodeA,
    nodeB: entry.nodeB,
    aToB: entry.aToB,
    bToA: entry.bToA
  }));
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    const clientIp = getClientAddress();
    if (!checkRateLimit(clientIp)) {
      return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const submission = (await request.json()) as ContributionSubmission;

    const validation = validateContribution(submission);
    if (!validation.valid) {
      return json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    // Extract and map references
    const newReferences = submission.newReferences.map((bibtex, index) => {
      const citationKey = extractCitationKey(bibtex);
      if (!citationKey) {
        throw new Error(`Unable to extract citation key for new reference at index ${index}`);
      }

      return {
        citationKey,
        bibtex: bibtex.trim()
      };
    });

    const placeholderMap = new Map<string, string>();
    newReferences.forEach((ref, index) => {
      placeholderMap.set(`new-${index}`, ref.citationKey);
    });

    const allReferences = new Set<string>();

    // Process languages to add
    const languagesToAdd = submission.languagesToAdd.map((language) => {
      const languageId = language.id.trim();
      const descriptionRefs = mapReferences(language.descriptionRefs, placeholderMap);
      descriptionRefs.forEach((ref) => allReferences.add(ref));

      const queries = normalizeOperationSupport(
        language.properties.queries,
        placeholderMap,
        allReferences
      );

      const transformations = normalizeOperationSupport(
        language.properties.transformations,
        placeholderMap,
        allReferences
      );

      const tags = normalizeTags(language.tags, placeholderMap, allReferences);

      language.existingReferences
        .map((ref: string) => ref.trim())
        .filter(Boolean)
        .forEach((ref: string) => allReferences.add(ref));

      const languageData: LanguagePayload = {
        id: languageId,
        name: language.name.trim(),
        fullName: language.fullName.trim(),
        description: language.description.trim(),
        descriptionRefs,
        properties: {
          queries,
          transformations
        },
        tags,
        references: Array.from(allReferences)
      };

      return {
        slug: languageId,
        module: toModuleIdentifier(languageId),
        data: languageData
      };
    });

    // Process languages to edit
    const languagesToEdit = submission.languagesToEdit.map((language) => {
      const languageId = language.id.trim();
      const descriptionRefs = mapReferences(language.descriptionRefs, placeholderMap);
      descriptionRefs.forEach((ref) => allReferences.add(ref));

      const queries = normalizeOperationSupport(
        language.properties.queries,
        placeholderMap,
        allReferences
      );

      const transformations = normalizeOperationSupport(
        language.properties.transformations,
        placeholderMap,
        allReferences
      );

      const tags = normalizeTags(language.tags, placeholderMap, allReferences);

      language.existingReferences
        .map((ref: string) => ref.trim())
        .filter(Boolean)
        .forEach((ref: string) => allReferences.add(ref));

      const languageData: LanguagePayload = {
        id: languageId,
        name: language.name.trim(),
        fullName: language.fullName.trim(),
        description: language.description.trim(),
        descriptionRefs,
        properties: {
          queries,
          transformations
        },
        tags,
        references: Array.from(allReferences)
      };

      return {
        slug: languageId,
        module: toModuleIdentifier(languageId),
        data: languageData
      };
    });

    // Process edge updates
    const edgeUpdates = normalizeRelationships(
      submission.relationships,
      placeholderMap,
      allReferences
    );

    const payload: ContributionPayload = {
      languagesToAdd,
      languagesToEdit,
      newReferences,
      edgeUpdates,
      contributorEmail: submission.contributorEmail.trim(),
      contributorGithub: submission.contributorGithub?.trim() || undefined
    };

    // Check if GitHub token is configured
    if (!env.CONTRIBUTION_TOKEN) {
      console.error('CONTRIBUTION_TOKEN is not configured');
      return json({ 
        error: 'GitHub integration not configured. Please contact the administrator.',
        details: 'CONTRIBUTION_TOKEN environment variable is missing'
      }, { status: 500 });
    }

    console.log('Dispatching contribution to GitHub...');
    console.log('Payload summary:', {
      languagesToAdd: languagesToAdd.length,
      languagesToEdit: languagesToEdit.length,
      newReferences: newReferences.length,
      edgeUpdates: edgeUpdates.length
    });

    const response = await fetch('https://api.github.com/repos/dkahdian/kcm/dispatches', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.CONTRIBUTION_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'data-contribution',
        client_payload: payload
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return json({ 
        error: 'Failed to trigger contribution workflow',
        details: `GitHub API returned ${response.status}: ${errorText}`
      }, { status: 500 });
    }

    console.log('Successfully dispatched contribution to GitHub');

    return json({
      success: true,
      message: 'Contribution submitted successfully! A pull request will be created shortly.',
      summary: {
        languagesAdded: languagesToAdd.length,
        languagesEdited: languagesToEdit.length,
        relationshipsUpdated: edgeUpdates.length
      }
    });
  } catch (error) {
    console.error('Contribution API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
