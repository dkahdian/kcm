import assert from 'node:assert/strict';
import {
  containsEntityLinks,
  renderEntityLinks
} from '../src/lib/utils/math-text.js';

type Definition = { id: string; title: string };

const definitions: Definition[] = [
  { id: 'representation-language', title: 'Representation Language' },
  { id: 'language-family', title: 'Language Family' }
];

const definitionLookup = new Map(definitions.map((definition) => [definition.id, definition]));
const definitionTitleLookup = new Map(
  definitions.map((definition) => [definition.title.toLowerCase(), definition.id])
);

function resolveDefinitionRef(ref: string): { id: string; title: string; resolved: boolean } {
  const normalized = ref.trim();
  const byId = definitionLookup.get(normalized);
  if (byId) {
    return { id: byId.id, title: byId.title, resolved: true };
  }

  const byTitleId = definitionTitleLookup.get(normalized.toLowerCase());
  if (byTitleId) {
    const definition = definitionLookup.get(byTitleId);
    if (definition) {
      return { id: definition.id, title: definition.title, resolved: true };
    }
  }

  return { id: normalized, title: normalized, resolved: false };
}

function assertIncludes(haystack: string, needle: string, message: string) {
  assert.ok(haystack.includes(needle), `${message}\nExpected to include: ${needle}\nActual: ${haystack}`);
}

// containsEntityLinks should recognize defref alongside the existing link commands.
assert.equal(containsEntityLinks('See \\defref{representation-language}'), true);
assert.equal(containsEntityLinks('See \\langref{CNF}'), true);
assert.equal(containsEntityLinks('See \\edgeref{a}{b}'), true);
assert.equal(containsEntityLinks('See \\opref{a}{CO}'), true);
assert.equal(containsEntityLinks('Plain text only'), false);

// Definition id resolution should link to the About page anchor.
const byId = renderEntityLinks(
  'Refer to \\defref{representation-language}.',
  (id) => id,
  undefined,
  undefined,
  resolveDefinitionRef
);
assertIncludes(byId, 'href="/about#representation-language"', 'definition id should link to /about#id');
assertIncludes(byId, '>Representation Language<', 'definition id should render the canonical title');

// Title fallback should resolve to the same anchor.
const byTitle = renderEntityLinks(
  'Refer to \\defref{Language Family}.',
  (id) => id,
  undefined,
  undefined,
  resolveDefinitionRef
);
assertIncludes(byTitle, 'href="/about#language-family"', 'definition title should link to the matching definition id');
assertIncludes(byTitle, '>Language Family<', 'definition title should render the canonical title');

// Missing references should stay visible instead of breaking rendering.
const missing = renderEntityLinks(
  'Refer to \\defref{missing-definition}.',
  (id) => id,
  undefined,
  undefined,
  resolveDefinitionRef
);
assertIncludes(missing, 'entity-link--unknown', 'missing definition should render a visible unknown marker');
assertIncludes(missing, '[?]', 'missing definition should render a visible marker');

// Existing link types should continue to work.
const mixed = renderEntityLinks(
  '\\langref{CNF} \\edgeref{lang_a}{lang_b} \\opref{lang_a}{CO}',
  (id) => (id === 'lang_cnf' ? 'CNF' : id),
  (code) => code,
  (name) => (name === 'CNF' ? 'lang_cnf' : undefined),
  resolveDefinitionRef
);
assertIncludes(mixed, 'data-entity-type="lang"', 'language links should still render');
assertIncludes(mixed, 'data-entity-type="edge"', 'edge links should still render');
assertIncludes(mixed, 'data-entity-type="op"', 'operation links should still render');

console.log('math-text defref checks passed');
