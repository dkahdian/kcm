import katex from 'katex';

const LATEX_TRIGGER = /(\$\$?[\s\S]*?\$|\\\[|\\\(|\\begin\{)/;
const LATEX_FRAGMENT = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;

export interface MathRenderResult {
  hasLatex: boolean;
  html: string | null;
  plainText: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    return { hasLatex: false, html: null, plainText: text };
  }

  if (!containsLatex(text)) {
    return { hasLatex: false, html: null, plainText: text };
  }

  LATEX_FRAGMENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  let html = '';
  let foundLatex = false;

  while ((match = LATEX_FRAGMENT.exec(text)) !== null) {
    foundLatex = true;
    html += escapeHtml(text.slice(cursor, match.index));
    const fragment = match[0];
    const { content, displayMode } = stripDelimiters(fragment);
    html += renderFragment(content.trim(), displayMode);
    cursor = match.index + fragment.length;
  }

  if (!foundLatex) {
    return { hasLatex: false, html: null, plainText: text };
  }

  html += escapeHtml(text.slice(cursor));
  return { hasLatex: true, html, plainText: text };
}

export function containsLatex(input?: string | null): boolean {
  if (!input) return false;
  return LATEX_TRIGGER.test(input);
}
