import katex from 'katex';

const LATEX_TRIGGER = /(\$\$?[\s\S]*?\$|\\\[|\\\(|\\begin\{|\\cite[tp]?\{)/;
const LATEX_FRAGMENT = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
const CITATION_PATTERN = /\\cite[tp]?\{([^}]+)\}/g;

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

  // Extract citation keys first
  const citationKeys = extractCitationKeys(text);

  if (!containsLatex(text)) {
    // No LaTeX, but still convert newlines to <br> for proper display
    const htmlWithBreaks = escapeHtml(text).replace(/\n/g, '<br>');
    return { hasLatex: false, html: htmlWithBreaks, plainText: text, citationKeys };
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
    return { hasLatex: false, html: htmlWithBreaks, plainText: text, citationKeys };
  }

  html += escapeHtml(text.slice(cursor)).replace(/\n/g, '<br>');
  return { hasLatex: true, html, plainText: text, citationKeys };
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
