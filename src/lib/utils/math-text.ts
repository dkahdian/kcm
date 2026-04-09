import katex from 'katex';

const LATEX_TRIGGER = /(\$\$?[\s\S]*?\$|\\\[|\\\(|\\begin\{|\\cite[tp]?\{|\\langref\{|\\n?edgeref\{|\\n?opref\{)/;
const LATEX_FRAGMENT = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
const CITATION_PATTERN = /\\cite[tp]?\{([^}]+)\}/g;

// Entity link patterns (processed after HTML rendering)
const LANGREF_PATTERN = /\\langref\{([^}]+)\}/g;
const EDGEREF_PATTERN = /\\edgeref\{([^}]+)\}\{([^}]+)\}/g;
const NEDGEREF_PATTERN = /\\nedgeref\{([^}]+)\}\{([^}]+)\}/g;
const OPREF_PATTERN = /\\opref\{([^}]+)\}\{([^}]+)\}/g;
const NOPREF_PATTERN = /\\nopref\{([^}]+)\}\{([^}]+)\}/g;
const EMPH_PATTERN = /\\emph\{([^}]+)\}/g;
const TEXTIT_PATTERN = /\\textit\{([^}]+)\}/g;

/**
 * LRU-style render cache for renderMathText results.
 * Avoids re-running KaTeX for identical input strings (e.g., the same
 * status notation rendered in hundreds of matrix cells).
 */
const renderCache = new Map<string, MathRenderResult>();
const RENDER_CACHE_MAX = 512;

export interface MathRenderResult {
  hasLatex: boolean;
  html: string | null;
  plainText: string;
  /** Citation keys found in the text (from \cite{key}, \citet{key}, \citep{key}) */
  citationKeys: string[];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extract all citation keys from text.
 * Supports \cite{key}, \citet{key}, \citep{key} and comma-separated keys like \cite{key1,key2}
 */
export function extractCitationKeys(text: string): string[] {
  const keys: string[] = [];
  CITATION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = CITATION_PATTERN.exec(text)) !== null) {
    const keyList = match[1];
    // Handle comma-separated keys like \cite{darwiche2002,bova2016}
    const individualKeys = keyList.split(',').map(k => k.trim()).filter(Boolean);
    keys.push(...individualKeys);
  }
  
  return keys;
}

/**
 * Check if text contains citation commands
 */
export function containsCitations(text: string): boolean {
  return /\\cite[tp]?\{/.test(text);
}

function stripDelimiters(fragment: string): { content: string; displayMode: boolean } {
  if (fragment.startsWith('$$') && fragment.endsWith('$$')) {
    return { content: fragment.slice(2, -2), displayMode: true };
  }
  if (fragment.startsWith('$') && fragment.endsWith('$')) {
    return { content: fragment.slice(1, -1), displayMode: false };
  }
  if (fragment.startsWith('\\[') && fragment.endsWith('\\]')) {
    return { content: fragment.slice(2, -2), displayMode: true };
  }
  if (fragment.startsWith('\\(') && fragment.endsWith('\\)')) {
    return { content: fragment.slice(2, -2), displayMode: false };
  }
  return { content: fragment, displayMode: false };
}

function renderFragment(content: string, displayMode: boolean): string {
  try {
    return katex.renderToString(content, {
      throwOnError: false,
      displayMode
    });
  } catch {
    return escapeHtml(content);
  }
}

export function renderMathText(input?: string | null): MathRenderResult {
  const text = input ?? '';
  if (!text.trim()) {
    return { hasLatex: false, html: null, plainText: text, citationKeys: [] };
  }

  // Check render cache first
  const cached = renderCache.get(text);
  if (cached) return cached;

  // Extract citation keys first
  const citationKeys = extractCitationKeys(text);

  /** Store result in cache and return it */
  function cacheAndReturn(result: MathRenderResult): MathRenderResult {
    if (renderCache.size >= RENDER_CACHE_MAX) {
      // Evict oldest entry
      const firstKey = renderCache.keys().next().value;
      if (firstKey !== undefined) renderCache.delete(firstKey);
    }
    renderCache.set(text, result);
    return result;
  }

  if (!containsLatex(text)) {
    // No LaTeX, but still convert newlines to <br> for proper display
    const htmlWithBreaks = escapeHtml(text).replace(/\n/g, '<br>');
    return cacheAndReturn({ hasLatex: false, html: htmlWithBreaks, plainText: text, citationKeys });
  }

  LATEX_FRAGMENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  let html = '';
  let foundLatex = false;

  while ((match = LATEX_FRAGMENT.exec(text)) !== null) {
    foundLatex = true;
    html += escapeHtml(text.slice(cursor, match.index)).replace(/\n/g, '<br>');
    const fragment = match[0];
    const { content, displayMode } = stripDelimiters(fragment);
    html += renderFragment(content.trim(), displayMode);
    cursor = match.index + fragment.length;
  }

  if (!foundLatex) {
    const htmlWithBreaks = escapeHtml(text).replace(/\n/g, '<br>');
    return cacheAndReturn({ hasLatex: false, html: htmlWithBreaks, plainText: text, citationKeys });
  }

  html += escapeHtml(text.slice(cursor)).replace(/\n/g, '<br>');
  return cacheAndReturn({ hasLatex: true, html, plainText: text, citationKeys });
}

export function containsLatex(input?: string | null): boolean {
  if (!input) return false;
  return LATEX_TRIGGER.test(input);
}

/**
 * Render text with citations resolved to reference numbers.
 * The keyToNumber function should return the display number for a citation key,
 * or null if the reference is not found.
 */
export function renderTextWithCitations(
  html: string,
  keyToNumber: (key: string) => number | null,
  onCitationClick?: (key: string) => void
): string {
  // Replace citation commands with numbered links
  // Handle \cite{key}, \citet{key}, \citep{key}
  return html.replace(/\\cite[tp]?\{([^}]+)\}/g, (match, keyList: string) => {
    const keys = keyList.split(',').map(k => k.trim()).filter(Boolean);
    const numbers = keys.map(key => {
      const num = keyToNumber(key);
      if (num === null) {
        return `<span class="citation-unknown" title="Unknown reference: ${escapeHtml(key)}">[?]</span>`;
      }
      const dataKey = escapeHtml(key);
      return `<button class="citation-link" data-citation-key="${dataKey}" title="View reference">[${num}]</button>`;
    });
    return numbers.join('');
  });
}

/**
 * Check if text contains lightweight LaTeX text-formatting commands.
 */
export function containsLatexTextFormatting(text: string): boolean {
  return /\\(emph|textit)\{/.test(text);
}

/**
 * Render lightweight LaTeX text-formatting commands into HTML.
 */
export function renderLatexTextFormatting(html: string): string {
  return html
    .replace(EMPH_PATTERN, (_match, content: string) => `<em>${content}</em>`)
    .replace(TEXTIT_PATTERN, (_match, content: string) => `<em>${content}</em>`);
}

/**
 * Check if text contains entity link commands (\langref, \edgeref, \opref)
 */
export function containsEntityLinks(text: string): boolean {
  return /\\(langref|n?edgeref|n?opref)\{/.test(text);
}

/**
 * Render a language name, applying KaTeX if it contains LaTeX fragments.
 */
function renderNameHtml(name: string): string {
  if (containsLatex(name)) {
    const result = renderMathText(name);
    return result.html ?? escapeHtml(name);
  }
  return escapeHtml(name);
}

/**
 * Replace entity link commands with clickable <a> elements.
 * 
 * Supported commands:
 * - \langref{langId} → link to language info panel
 * - \edgeref{srcId}{tgtId} → link to edge info panel
 * - \opref{langId}{opCode} → link to operation cell info panel
 *
 * Uses <a> tags with href so Ctrl+click opens in a new tab.
 */
export function renderEntityLinks(
  html: string,
  idToName: (id: string) => string,
  opCodeToLabel?: (code: string) => string,
  nameToId?: (name: string) => string | undefined
): string {
  let result = html;

  /**
   * Resolve a langref argument that may be either an ID (lang_xxx) or a display name.
   * Returns { id, name } for building the link.
   */
  const resolveLang = (ref: string): { id: string; name: string; resolved: boolean } => {
    if (ref.startsWith('lang_')) {
      return { id: ref, name: idToName(ref), resolved: true };
    }
    const resolvedId = nameToId?.(ref);
    if (resolvedId) {
      return { id: resolvedId, name: ref, resolved: true };
    }
    return { id: ref, name: ref, resolved: false };
  };

  // Replace \langref{langId or langName}
  result = result.replace(LANGREF_PATTERN, (_match, langRef: string) => {
    const { id, name } = resolveLang(langRef);
    const nameHtml = renderNameHtml(name);
    if (!id.startsWith('lang_')) {
      return nameHtml;
    }
    const safeId = escapeHtml(id);
    return `<a class="entity-link lang-link" href="/#lang/${safeId}" data-entity-type="lang" data-lang-id="${safeId}">${nameHtml}</a>`;
  });

  // Replace \edgeref{srcRef}{tgtRef}
  result = result.replace(EDGEREF_PATTERN, (_match, srcRef: string, tgtRef: string) => {
    const src = resolveLang(srcRef);
    const tgt = resolveLang(tgtRef);
    const labelHtml = `${renderNameHtml(src.name)} compiles to ${renderNameHtml(tgt.name)}`;
    if (!src.resolved || !tgt.resolved || !src.id.startsWith('lang_') || !tgt.id.startsWith('lang_')) {
      return labelHtml;
    }
    const safeSrc = escapeHtml(src.id);
    const safeTgt = escapeHtml(tgt.id);
    return `<a class="entity-link edge-link" href="/#edge/${safeSrc}/${safeTgt}" data-entity-type="edge" data-source-id="${safeSrc}" data-target-id="${safeTgt}">${labelHtml}</a>`;
  });

  // Replace \nedgeref{srcRef}{tgtRef} (negative edge: "cannot compile to")
  result = result.replace(NEDGEREF_PATTERN, (_match, srcRef: string, tgtRef: string) => {
    const src = resolveLang(srcRef);
    const tgt = resolveLang(tgtRef);
    const labelHtml = `${renderNameHtml(src.name)} cannot compile to ${renderNameHtml(tgt.name)}`;
    if (!src.resolved || !tgt.resolved || !src.id.startsWith('lang_') || !tgt.id.startsWith('lang_')) {
      return labelHtml;
    }
    const safeSrc = escapeHtml(src.id);
    const safeTgt = escapeHtml(tgt.id);
    return `<a class="entity-link edge-link" href="/#edge/${safeSrc}/${safeTgt}" data-entity-type="edge" data-source-id="${safeSrc}" data-target-id="${safeTgt}">${labelHtml}</a>`;
  });

  // Replace \opref{langRef}{opCode}
  result = result.replace(OPREF_PATTERN, (_match, langRef: string, opCode: string) => {
    const lang = resolveLang(langRef);
    const opLabel = opCodeToLabel ? opCodeToLabel(opCode) : opCode;
    const labelHtml = `${renderNameHtml(lang.name)} supports ${escapeHtml(opLabel)}`;
    if (!lang.resolved || !lang.id.startsWith('lang_')) {
      return labelHtml;
    }
    const safeId = escapeHtml(lang.id);
    const safeCode = escapeHtml(opCode);
    return `<a class="entity-link op-link" href="/#op/${safeId}/${safeCode}" data-entity-type="op" data-lang-id="${safeId}" data-op-code="${safeCode}">${labelHtml}</a>`;
  });

  // Replace \nopref{langRef}{opCode} (negative op: "is unsupported by")
  result = result.replace(NOPREF_PATTERN, (_match, langRef: string, opCode: string) => {
    const lang = resolveLang(langRef);
    const opLabel = opCodeToLabel ? opCodeToLabel(opCode) : opCode;
    const labelHtml = `${escapeHtml(opLabel)} is unsupported by ${renderNameHtml(lang.name)}`;
    if (!lang.resolved || !lang.id.startsWith('lang_')) {
      return labelHtml;
    }
    const safeId = escapeHtml(lang.id);
    const safeCode = escapeHtml(opCode);
    return `<a class="entity-link op-link" href="/#op/${safeId}/${safeCode}" data-entity-type="op" data-lang-id="${safeId}" data-op-code="${safeCode}">${labelHtml}</a>`;
  });

  return result;
}
