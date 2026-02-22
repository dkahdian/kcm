/**
 * Bidirectional transformation between JSON database and LaTeX/Overleaf format.
 * 
 * This script provides two transformation directions:
 * 
 * 1. JSON → LaTeX (--to-latex):
 *    - Reads database.json
 *    - Generates claims.tex (succinctness edges, grouped by reference)
 *    - Generates languages.tex (language definitions)
 *    - Generates queries.tex (query operation support claims, non-derived only)
 *    - Generates transformations.tex (transformation operation support claims, non-derived only)
 *    - Generates separating-functions.tex (separating function definitions)
 *    - Generates refs.bib (BibTeX references)
 * 
 * 2. LaTeX → JSON (--to-json):
 *    - Parses all LaTeX files with STRICT canonical format requirements
 *    - Updates database.json with editable content (descriptions, refs, caveats)
 *    - Runs refresh-derived.ts to propagate changes
 * 
 * CANONICAL CLAIM FORMAT for edges (strictly enforced):
 *   \begin{claim}[status=STATUS]
 *   $LANG1$ transforms to $LANG2$ (unless CAVEAT)?
 *   \end{claim}
 * 
 * CANONICAL CLAIM FORMAT for operations (strictly enforced):
 *   \begin{claim}[lang=LANG_ID, op=OP_CODE]
 *   $LANG$ supports OP_LABEL COMPLEXITY_TEXT (unless CAVEAT)?
 *   \end{claim}
 * 
 * Usage:
 *   npx tsx scripts/latex-bijection.ts --to-latex [-o output.tex]
 *   npx tsx scripts/latex-bijection.ts --to-json input.tex
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DATABASE_PATH, loadDatabase, saveDatabase, type DatabaseSchema } from './shared/database.js';

// Get script directory (still needed for LaTeX/BibTeX paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Paths (LaTeX-specific, not shared)
const DEFAULT_LATEX_OUTPUT = path.join(__dirname, '..', 'docs', 'claims.tex');
const DEFAULT_LANGUAGES_OUTPUT = path.join(__dirname, '..', 'docs', 'languages.tex');
const DEFAULT_BIBTEX_OUTPUT = path.join(__dirname, '..', 'docs', 'refs.bib');
const DEFAULT_QUERIES_OUTPUT = path.join(__dirname, '..', 'docs', 'queries.tex');
const DEFAULT_TRANSFORMS_OUTPUT = path.join(__dirname, '..', 'docs', 'transformations.tex');
const DEFAULT_SEPFUNCS_OUTPUT = path.join(__dirname, '..', 'docs', 'separating-functions.tex');

// Import types
import type { 
  DirectedSuccinctnessRelation, 
  KCAdjacencyMatrix, 
  KCLanguage, 
  KCReference,
  KCSeparatingFunction,
  KCOpSupport,
  KCOpSupportMap
} from '../src/lib/types.js';

// =============================================================================
// Edge Representation
// =============================================================================

interface Edge {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  status: string;
  description: string;
  caveat: string;
  refs: string[];
  derived: boolean;
  separatingFunctionIds?: string[];
  // For no-poly-quasi edges with structured proofs
  noPolyDescription?: { description: string; refs: string[]; derived: boolean };
  quasiDescription?: { description: string; refs: string[]; derived: boolean };
}

// =============================================================================
// CANONICAL STATUS DEFINITIONS
// These are the ONLY valid statuses. The claim text is deterministic.
// =============================================================================

/**
 * All valid complexity/compilation status codes.
 * Maps status code → canonical claim text fragment (human-readable English).
 */
const CANONICAL_STATUSES: Record<string, string> = {
  'poly':                   'is polynomial-time compilable to',
  'no-poly-unknown-quasi':  'is not polynomial-time compilable to',
  'no-poly-quasi':          'is not polynomial-time (but is quasi-polynomial-time) compilable to',
  'unknown-poly-quasi':     'has unknown polynomial-time (but has quasi-polynomial-time) compilation to',
  'no-quasi':               'is not quasi-polynomial-time compilable to',
  'unknown-both':           'has unknown compilation to',
};

/**
 * All valid operation complexity codes.
 * Maps complexity code → canonical claim text fragment for operation support.
 */
const CANONICAL_OP_COMPLEXITIES: Record<string, string> = {
  // Order matters: more specific patterns must come BEFORE less specific ones,
  // since parseOpsLatex() uses body.includes(text) and breaks on first match.
  'no-poly-unknown-quasi':  'not in polynomial time (quasi-polynomial unknown)',
  'no-poly-quasi':          'not in polynomial time (but in quasi-polynomial time)',
  'unknown-poly-quasi':     'in unknown polynomial time (but in quasi-polynomial time)',
  'no-quasi':               'not in quasi-polynomial time',
  'unknown-both':           'in unknown complexity',
  'unknown-to-us':          'in unknown-to-us complexity',
  'poly':                   'in polynomial time',
};

// =============================================================================
// LaTeX Helpers
// =============================================================================

/**
 * Convert language name to canonical LaTeX display format.
 * This is a bijection - must be reversible by parseLanguageName().
 * 
 * Examples:
 *   "NNF" → "$NNF$"
 *   "OBDD$_<$" → "$OBDD_<$"
 *   "d-DNNF" → "$d$-$DNNF$"
 *   "dec-SDNNF" → "$dec$-$SDNNF$"
 */
function languageToLatex(name: string): string {
  // If it already has $ signs, handle subscript notation
  if (name.includes('$')) {
    // OBDD$_<$ → $OBDD_<$
    return '$' + name.replace(/\$/g, '') + '$';
  }
  
  // Handle hyphenated names: d-DNNF → $d$-$DNNF$, dec-SDNNF → $dec$-$SDNNF$
  if (name.includes('-')) {
    return name.split('-').map(p => `$${p}$`).join('-');
  }
  
  // Simple names: NNF → $NNF$
  return `$${name}$`;
}

/**
 * Parse language name from LaTeX format back to database format.
 * Inverse of languageToLatex().
 * 
 * Examples:
 *   "$NNF$" → "NNF"
 *   "$OBDD_<$" → "OBDD$_<$"
 *   "$d$-$DNNF$" → "d-DNNF"
 */
function parseLanguageName(latex: string): string {
  let name = latex.trim();
  
  // Handle $d$-$DNNF$ format → d-DNNF
  if (name.includes('-')) {
    // Split by -, parse each part, rejoin
    return name.split('-').map(part => {
      part = part.trim();
      if (part.startsWith('$') && part.endsWith('$')) {
        return part.slice(1, -1);
      }
      return part;
    }).join('-');
  }
  
  // Handle $OBDD_<$ format → OBDD$_<$
  if (name.startsWith('$') && name.endsWith('$')) {
    const inner = name.slice(1, -1);
    // If it has subscript notation, convert back
    if (inner.includes('_<') || inner.includes('_>')) {
      return inner.replace(/(_[<>])/g, '$$$1$$');
    }
    // Otherwise just return the inner part
    return inner;
  }
  
  return name;
}

/**
 * Escape special LaTeX characters in section titles.
 */
function escapeLatex(text: string): string {
  // Don't escape if it already contains LaTeX commands
  if (text.includes('\\') || text.includes('$')) {
    return text;
  }
  return text
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#');
  // Note: we don't escape _ because it might be part of reference IDs
}

/**
 * Extract content from a LaTeX command with brace-delimited argument,
 * properly handling nested braces.
 * 
 * Given content starting after the opening '{', returns the matched content
 * up to the balanced closing '}', and the remainder of the string.
 * 
 * Example: "hello {world}} rest" with depth 1 → content="hello {world}", rest=" rest"
 */
function extractBraceContent(text: string, prefix: string): { content: string; rest: string } | null {
  const idx = text.indexOf(prefix);
  if (idx === -1) return null;

  const start = idx + prefix.length;
  // prefix should end with '{', so we start inside
  let depth = 1;
  let i = start;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;

  // i is now one past the closing brace
  const content = text.slice(start, i - 1);
  const rest = text.slice(i);
  return { content, rest };
}

// =============================================================================
// JSON → LaTeX Conversion
// =============================================================================

/**
 * Extract edges from adjacency matrix.
 * SKIPS derived edges - they will be regenerated by propagation.
 */
function extractEdges(database: DatabaseSchema): Edge[] {
  const { adjacencyMatrix, languages } = database;
  const edges: Edge[] = [];
  
  // Build ID to language map
  const idToLang = new Map<string, KCLanguage>();
  for (const lang of languages) {
    idToLang.set(lang.id, lang);
  }
  
  const { languageIds, matrix } = adjacencyMatrix;
  const n = languageIds.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      
      const relation = matrix[i]?.[j] as DirectedSuccinctnessRelation | null;
      if (!relation || !relation.status) continue;
      
      // Skip statuses we don't handle
      if (!CANONICAL_STATUSES[relation.status]) continue;
      
      // SKIP FULLY DERIVED EDGES - they will be regenerated by propagation
      if (relation.derived) continue;
      
      const fromId = languageIds[i];
      const toId = languageIds[j];
      const fromLang = idToLang.get(fromId);
      const toLang = idToLang.get(toId);
      
      if (!fromLang || !toLang) continue;
      
      edges.push({
        fromId,
        fromName: fromLang.name,
        toId,
        toName: toLang.name,
        status: relation.status,
        description: relation.description || '',
        caveat: relation.caveat || '',
        refs: relation.refs || [],
        derived: false, // We skip derived edges above
        separatingFunctionIds: relation.separatingFunctionIds,
        noPolyDescription: relation.noPolyDescription,
        quasiDescription: relation.quasiDescription
      });
    }
  }
  
  return edges;
}

/**
 * Group edges by primary reference (sorted by frequency)
 */
function groupEdgesByReference(edges: Edge[]): Map<string, Edge[]> {
  // Count reference occurrences across all edges
  const refCounts = new Map<string, number>();
  
  for (const edge of edges) {
    const allRefs = new Set<string>(edge.refs);
    if (edge.noPolyDescription) {
      edge.noPolyDescription.refs.forEach(r => allRefs.add(r));
    }
    if (edge.quasiDescription) {
      edge.quasiDescription.refs.forEach(r => allRefs.add(r));
    }
    
    for (const ref of allRefs) {
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    }
  }
  
  // Sort references by frequency (descending)
  const sortedRefs = [...refCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ref]) => ref);
  
  // Group edges by primary reference
  const grouped = new Map<string, Edge[]>();
  const usedEdges = new Set<Edge>();
  
  // Add "No Reference" category
  grouped.set('__NO_REFERENCE__', []);
  
  for (const ref of sortedRefs) {
    grouped.set(ref, []);
  }
  
  // Assign each edge to its primary (most frequent) reference
  for (const edge of edges) {
    const allRefs = new Set<string>(edge.refs);
    if (edge.noPolyDescription) {
      edge.noPolyDescription.refs.forEach(r => allRefs.add(r));
    }
    if (edge.quasiDescription) {
      edge.quasiDescription.refs.forEach(r => allRefs.add(r));
    }
    
    if (allRefs.size === 0) {
      grouped.get('__NO_REFERENCE__')!.push(edge);
      usedEdges.add(edge);
      continue;
    }
    
    // Find the most frequent reference for this edge
    let primaryRef: string | null = null;
    let maxCount = 0;
    
    for (const ref of sortedRefs) {
      if (allRefs.has(ref)) {
        const count = refCounts.get(ref) || 0;
        if (count > maxCount) {
          maxCount = count;
          primaryRef = ref;
        }
        break; // Take the first (most frequent) match
      }
    }
    
    if (primaryRef && !usedEdges.has(edge)) {
      grouped.get(primaryRef)!.push(edge);
      usedEdges.add(edge);
    }
  }
  
  // Remove empty groups
  for (const [key, value] of grouped) {
    if (value.length === 0) {
      grouped.delete(key);
    }
  }
  
  return grouped;
}

/**
 * Compute effective status for a partially derived edge.
 * - If no-poly is not derived but quasi is derived → 'no-poly-unknown-quasi'
 * - If no-poly is derived but quasi is not derived → 'unknown-poly-quasi'
 * - Otherwise return original status
 */
function getEffectiveStatus(edge: Edge): string {
  const hasNoPoly = edge.noPolyDescription !== undefined;
  const hasQuasi = edge.quasiDescription !== undefined;
  
  // Only applies to no-poly-quasi edges with partial derivation
  if (hasNoPoly && hasQuasi && edge.status === 'no-poly-quasi') {
    const noPolyDerived = edge.noPolyDescription!.derived;
    const quasiDerived = edge.quasiDescription!.derived;
    
    if (noPolyDerived && !quasiDerived) {
      // No-poly part is derived, quasi is manual → claim is about quasi
      return 'unknown-poly-quasi';
    }
    if (!noPolyDerived && quasiDerived) {
      // No-poly is manual, quasi is derived → claim is about no-poly
      return 'no-poly-unknown-quasi';
    }
  }
  
  return edge.status;
}

/**
 * Build claim text with effective status (accounts for partial derivation).
 */
function buildClaimTextWithEffectiveStatus(edge: Edge): string {
  const fromLatex = languageToLatex(edge.fromName);
  const toLatex = languageToLatex(edge.toName);
  const effectiveStatus = getEffectiveStatus(edge);
  const transformType = CANONICAL_STATUSES[effectiveStatus];
  
  if (!transformType) {
    throw new Error(`Unknown status: ${effectiveStatus}`);
  }
  
  let claim = `${fromLatex} ${transformType} ${toLatex}`;
  
  if (edge.caveat) {
    claim += ` unless ${edge.caveat}`;
  }
  
  // For partially derived edges, only include refs from non-derived part
  let refs = edge.refs;
  const hasNoPoly = edge.noPolyDescription !== undefined;
  const hasQuasi = edge.quasiDescription !== undefined;
  
  if (hasNoPoly && hasQuasi && edge.status === 'no-poly-quasi') {
    const noPolyDerived = edge.noPolyDescription!.derived;
    const quasiDerived = edge.quasiDescription!.derived;
    
    if (noPolyDerived && !quasiDerived) {
      // Use quasi refs only
      refs = edge.quasiDescription!.refs;
    } else if (!noPolyDerived && quasiDerived) {
      // Use no-poly refs only
      refs = edge.noPolyDescription!.refs;
    }
  }
  
  // Add references at the end
  if (refs && refs.length > 0) {
    claim += ` \\citet{${refs.join(',')}}`;
  }
  
  return claim;
}

/**
 * Generate a single claim block with STRICT canonical format.
 * 
 * Format:
 *   \begin{claim}
 *   $LANG1$ TRANSFORMATION_TYPE $LANG2$ (unless CAVEAT)? \citet{REFS}?
 *   \end{claim}
 *   \begin{claimdescription}
 *   DESCRIPTION (EDITABLE)
 *   \end{claimdescription}
 * 
 * For partially derived edges (derived: false but one sub-description has derived: true),
 * only includes the non-derived proof content with adjusted status.
 */
function generateClaim(edge: Edge): string {
  const claimText = buildClaimTextWithEffectiveStatus(edge);
  
  // Build proof sketch content - handle partial derivation
  // For no-poly-quasi edges, check if one part is derived and one is not
  let proofSketch: string;
  
  const hasNoPoly = edge.noPolyDescription !== undefined;
  const hasQuasi = edge.quasiDescription !== undefined;
  
  if (hasNoPoly && hasQuasi) {
    const noPolyDerived = edge.noPolyDescription!.derived;
    const quasiDerived = edge.quasiDescription!.derived;
    
    // Check for partial derivation (one derived, one not)
    if (noPolyDerived !== quasiDerived) {
      // Partial derivation - only include non-derived part
      if (!noPolyDerived) {
        proofSketch = edge.noPolyDescription!.description || '(Proof needed)';
      } else {
        proofSketch = edge.quasiDescription!.description || '(Proof needed)';
      }
    } else {
      // Both have same derivation status - use full description
      proofSketch = edge.description || '(Description needed)';
    }
  } else {
    // No sub-descriptions or only one - use full description
    proofSketch = edge.description || '(Description needed)';
  }
  
  // Build separator comment if applicable
  const sepComment = edge.separatingFunctionIds && edge.separatingFunctionIds.length > 0
    ? `% separators=${edge.separatingFunctionIds.join(',')}
`
    : '';

  return `${sepComment}\\begin{claim}
${claimText}
\\end{claim}
\\begin{claimdescription}
${proofSketch}
\\end{claimdescription}
`;
}

/**
 * Build a section from a reference ID and its edges
 */
function buildSection(refId: string, refEdges: Edge[], refMap: Map<string, KCReference>): string {
  let sectionTitle: string;
  
  if (refId === '__NO_REFERENCE__') {
    sectionTitle = 'No Reference';
  } else {
    const ref = refMap.get(refId);
    sectionTitle = ref ? ref.title.slice(0, 80) + (ref.title.length > 80 ? '...' : '') : refId;
  }
  
  // Sort edges within section by from language, then to language
  refEdges.sort((a, b) => {
    const fromCmp = a.fromName.localeCompare(b.fromName);
    if (fromCmp !== 0) return fromCmp;
    return a.toName.localeCompare(b.toName);
  });
  
  const claims = refEdges
    .map(edge => generateClaim(edge))
    .filter(c => c.length > 0)
    .join('\n');
  
  if (claims.length === 0) {
    return '';
  }
  
  return `% =============================
\\section{${escapeLatex(sectionTitle)}}
% Reference ID: ${refId}
% =============================
${claims}`;
}

/**
 * Generate the full LaTeX document
 */
function generateLatex(database: DatabaseSchema): string {
  const edges = extractEdges(database);
  const groupedEdges = groupEdgesByReference(edges);
  
  // Reference lookup for section titles
  const refMap = new Map<string, KCReference>();
  for (const ref of database.references) {
    refMap.set(ref.id, ref);
  }
  
  // Build sections - put "No Reference" last
  const sections: string[] = [];
  let noRefSection: string | null = null;
  
  for (const [refId, refEdges] of groupedEdges) {
    const section = buildSection(refId, refEdges, refMap);
    if (!section) continue;
    
    if (refId === '__NO_REFERENCE__') {
      noRefSection = section;
    } else {
      sections.push(section);
    }
  }
  
  // Add "No Reference" section at the end
  if (noRefSection) {
    sections.push(noRefSection);
  }
  
  // Build full document
  const preamble = `% =============================
% Knowledge Compilation Map - Claims and Descriptions
% Auto-generated from database.json
% Generated: ${new Date().toISOString()}
% 
% EDITING INSTRUCTIONS:
% - Claims (\\begin{claim}...\\end{claim}) are auto-generated. Do NOT edit.
% - Descriptions (\\begin{claimdescription}...\\end{claimdescription}) are EDITABLE.
% - Lines starting with "% [DERIVED" indicate auto-propagated edges.
% - To sync back to JSON, run: npx tsx scripts/latex-bijection.ts --to-json <this-file>
% =============================
\\documentclass[11pt]{article}

% -------- Packages --------
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{mathtools}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{cleveref}
\\usepackage{xcolor}
\\usepackage{natbib}

% -------- Hyperref setup --------
\\hypersetup{
  colorlinks=true,
  linkcolor=blue,
  citecolor=blue,
  urlcolor=blue
}

% -------- Theorem styles --------
\\theoremstyle{plain}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{proposition}[theorem]{Proposition}
\\newtheorem{corollary}[theorem]{Corollary}
\\newtheorem{claim}{Claim}[section]

\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{example}[theorem]{Example}

\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{Remark}

% -------- Description environment (just indented text, no prefix) --------
\\newenvironment{claimdescription}{%
  \\par\\noindent\\ignorespaces
}{\\par}

% -------- Handy macros --------
\\newcommand{\\R}{\\mathbb{R}}
\\newcommand{\\N}{\\mathbb{N}}
\\newcommand{\\eps}{\\varepsilon}

% -------- Title info --------
\\title{Knowledge Compilation Map: Claims}
\\date{\\today}

\\begin{document}
\\maketitle

\\tableofcontents
\\newpage

`;

  const postamble = `
% =============================
% Bibliography
% =============================
\\bibliographystyle{plainnat}
\\bibliography{refs}

\\end{document}
`;

  return preamble + sections.join('\n\n') + postamble;
}

// =============================================================================
// LaTeX → JSON Conversion (STRICT PARSER)
// =============================================================================

interface ParsedClaim {
  fromName: string;
  toName: string;
  status: string;
  caveat: string;
  proofSketch: string;  // Copied directly to description field
  refs: string[];       // References from the claim line
  derived: boolean;
  separatingFunctionIds?: string[];  // Separating functions referenced by this edge
}

/**
 * Parse the canonical claim format strictly.
 * 
 * Expected format:
 *   \begin{claim}
 *   $LANG1$ TRANSFORMATION_TYPE $LANG2$ (unless CAVEAT)? (\citet{REFS})?
 *   \end{claim}
 * 
 * Returns null if the format doesn't match exactly.
 */
function parseCanonicalClaim(
  claimLine: string,  // The \begin{claim} line
  claimBody: string,  // The content between begin/end
  proofSketch: string,
  derived: boolean
): ParsedClaim | null {
  // Parse claim body: $LANG1$ TRANSFORMATION_TYPE $LANG2$ (unless CAVEAT)? (\citet{REFS})?
  let body = claimBody.trim();
  
  // First, extract and remove citation if present (always at the end)
  let refs: string[] = [];
  const citeMatch = body.match(/\\citet?\{([^}]+)\}\s*$/);
  if (citeMatch) {
    refs = citeMatch[1].split(',').map(s => s.trim());
    body = body.slice(0, citeMatch.index).trim();
  }
  
  // Extract caveat if present (comes before citation)
  let caveat = '';
  const unlessMatch = body.match(/\s+unless\s+(.+)$/i);
  if (unlessMatch) {
    caveat = unlessMatch[1].trim();
    body = body.slice(0, unlessMatch.index).trim();
  }
  
  // Now body should be: $LANG1$ TRANSFORMATION_TYPE $LANG2$
  // We need to infer the status from the transformation text
  
  // Find which CANONICAL_STATUS the transformation text matches
  let status: string | null = null;
  let transformText: string | null = null;
  
  for (const [statusCode, transformationType] of Object.entries(CANONICAL_STATUSES)) {
    if (body.includes(transformationType)) {
      status = statusCode;
      transformText = transformationType;
      break;
    }
  }
  
  if (!status || !transformText) {
    console.warn(`Could not determine status from claim body: ${body}`);
    console.warn(`  Known transformations: ${Object.values(CANONICAL_STATUSES).join(', ')}`);
    return null;
  }
  
  // Build regex to match: $LANG1$ TRANSFORMATION_TYPE $LANG2$
  // LANG can be like: $NNF$, $OBDD_<$, $d$-$DNNF$
  const langPattern = '(\\$[^$]+\\$(?:-\\$[^$]+\\$)?)';  // Matches $X$ or $X$-$Y$
  const claimRegex = new RegExp(
    `^${langPattern}\\s+${escapeRegex(transformText)}\\s+${langPattern}$`
  );
  
  const claimMatch = body.match(claimRegex);
  if (!claimMatch) {
    console.warn(`Claim body doesn't match expected format for status="${status}":`);
    console.warn(`  Expected: $LANG1$ ${transformText} $LANG2$`);
    console.warn(`  Got: ${body}`);
    return null;
  }
  
  const fromLatex = claimMatch[1];
  const toLatex = claimMatch[2];
  
  const fromName = parseLanguageName(fromLatex);
  const toName = parseLanguageName(toLatex);
  
  return {
    fromName,
    toName,
    status,
    caveat,
    proofSketch: proofSketch.trim(),  // Copy directly - this is the editable part
    derived,
    refs  // References extracted from the claim line
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse LaTeX file with STRICT format requirements.
 */
function parseLatex(latexContent: string): ParsedClaim[] {
  const claims: ParsedClaim[] = [];
  const lines = latexContent.split('\n');
  let i = 0;
  let isDerived = false;
  
  let pendingSeparators: string[] | undefined = undefined;

  while (i < lines.length) {
    const line = lines[i];
    
    // Check for derived marker
    if (line.includes('% [DERIVED')) {
      isDerived = true;
      i++;
      continue;
    }

    // Check for separator metadata comment
    const sepMatch = line.match(/^%\s*separators=(.+)$/);
    if (sepMatch) {
      pendingSeparators = sepMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      i++;
      continue;
    }
    
    // Look for claim start: \begin{claim}
    if (line.includes('\\begin{claim}')) {
      const claimStartLine = line;
      
      // Collect claim content until \end{claim}
      let claimContent = '';
      i++;
      while (i < lines.length && !lines[i].includes('\\end{claim}')) {
        claimContent += lines[i] + '\n';
        i++;
      }
      i++; // Skip \end{claim}
      
      // Find and collect description content
      let proofContent = '';
      while (i < lines.length && !lines[i].includes('\\begin{claimdescription}')) {
        // Skip empty lines and comments between claim and description
        if (lines[i].trim() && !lines[i].trim().startsWith('%')) {
          console.warn(`Unexpected content between claim and description: ${lines[i]}`);
        }
        i++;
      }
      
      if (i < lines.length && lines[i].includes('\\begin{claimdescription}')) {
        i++; // Skip \begin{claimdescription}
        while (i < lines.length && !lines[i].includes('\\end{claimdescription}')) {
          proofContent += lines[i] + '\n';
          i++;
        }
        i++; // Skip \end{claimdescription}
      }
      
      // Parse the claim with strict validation
      const parsed = parseCanonicalClaim(
        claimStartLine,
        claimContent,
        proofContent,
        isDerived
      );
      
      if (parsed) {
        if (pendingSeparators && pendingSeparators.length > 0) {
          parsed.separatingFunctionIds = pendingSeparators;
        }
        claims.push(parsed);
      }
      
      isDerived = false;
      pendingSeparators = undefined;
      continue;
    }
    
    i++;
  }
  
  return claims;
}

/**
 * Build language name to ID map
 */
function buildNameToIdMap(languages: KCLanguage[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const lang of languages) {
    map.set(lang.name, lang.id);
    // Also add normalized versions
    map.set(lang.name.toLowerCase(), lang.id);
    map.set(lang.name.replace(/\$/g, ''), lang.id);
  }
  return map;
}

/**
 * Update database from parsed claims.
 * Only non-derived claims are updated.
 * The description is copied directly to the description field.
 * References, status, and caveat are taken from the claim line.
 */
function updateDatabase(database: DatabaseSchema, claims: ParsedClaim[]): void {
  const nameToId = buildNameToIdMap(database.languages);
  const { adjacencyMatrix } = database;
  const { languageIds, matrix } = adjacencyMatrix;
  
  // Build index lookup
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < languageIds.length; i++) {
    idToIndex.set(languageIds[i], i);
  }
  
  let updated = 0;
  let created = 0;
  let skipped = 0;
  
  for (const claim of claims) {
    // Skip derived claims - they'll be regenerated by propagation
    if (claim.derived) {
      skipped++;
      continue;
    }
    
    // Resolve language IDs by name
    const fromId = nameToId.get(claim.fromName) || nameToId.get(claim.fromName.toLowerCase());
    const toId = nameToId.get(claim.toName) || nameToId.get(claim.toName.toLowerCase());
    
    if (!fromId || !toId) {
      console.warn(`Could not resolve languages: ${claim.fromName} -> ${claim.toName}`);
      skipped++;
      continue;
    }
    
    const fromIdx = idToIndex.get(fromId);
    const toIdx = idToIndex.get(toId);
    
    if (fromIdx === undefined || toIdx === undefined) {
      console.warn(`Languages not in matrix: ${claim.fromName} (${fromId}) -> ${claim.toName} (${toId})`);
      skipped++;
      continue;
    }
    
    // Get existing relation or create a new one
    let existing = matrix[fromIdx][toIdx] as DirectedSuccinctnessRelation | null;
    
    if (!existing) {
      // Create a new edge from the parsed claim
      existing = {
        status: claim.status,
        description: claim.proofSketch,
        refs: claim.refs,
        derived: false,
      };
      if (claim.caveat) {
        existing.caveat = claim.caveat;
      }
      if (claim.separatingFunctionIds && claim.separatingFunctionIds.length > 0) {
        existing.separatingFunctionIds = claim.separatingFunctionIds;
      }
      matrix[fromIdx][toIdx] = existing;
      console.log(`  Created new edge: ${claim.fromName} -> ${claim.toName} (${claim.status})`);
      created++;
      continue;
    }
    
    // Update description field.
    // For edges with a canonical quasiDescription (e.g. unknown-poly-quasi),
    // the LaTeX claimdescription is the quasi proof sketch, not the main
    // description (which is derived from the composite no-poly + quasi proofs).
    if (existing.quasiDescription && !existing.quasiDescription.derived) {
      existing.quasiDescription.description = claim.proofSketch;
    } else {
      existing.description = claim.proofSketch;
    }
    
    // Update references from claim line (this was missing before!)
    if (claim.refs.length > 0) {
      existing.refs = claim.refs;
    }
    
    // Update caveat from claim line
    if (claim.caveat) {
      existing.caveat = claim.caveat;
    } else if ('caveat' in existing) {
      // If caveat was removed from LaTeX, remove it from DB too
      delete existing.caveat;
    }

    // Update separating function IDs
    if (claim.separatingFunctionIds && claim.separatingFunctionIds.length > 0) {
      existing.separatingFunctionIds = claim.separatingFunctionIds;
    } else if (existing.separatingFunctionIds) {
      // If separators were removed from LaTeX, remove from DB too
      delete existing.separatingFunctionIds;
    }
    
    // Note: We don't update the status because it's auto-generated in LaTeX
    // and changing it would break the bijection. Status changes should be
    // made directly in the database.
    
    updated++;
  }
  
  console.log(`Updated ${updated} edges, created ${created} new edges, skipped ${skipped} (derived or unresolved)`);
}

// =============================================================================
// BibTeX Generation and Parsing
// =============================================================================

/**
 * Normalize a BibTeX entry to use the given citation key.
 * Replaces @type{oldkey, with @type{newkey,
 */
function normalizeBibtexKey(bibtex: string, newKey: string): string {
  // Match @type{key, and replace with @type{newKey,
  return bibtex.replace(/(@\w+\{)([^,\s]+)(,)/, `$1${newKey}$3`);
}

/**
 * Generate BibTeX file content from database references.
 * Normalizes citation keys to match database reference IDs.
 */
function generateBibtex(database: DatabaseSchema): string {
  const entries: string[] = [];
  
  for (const ref of database.references) {
    if (ref.bibtex && ref.bibtex.trim()) {
      // Normalize the citation key to match our reference ID
      let entry = normalizeBibtexKey(ref.bibtex.trim(), ref.id);
      entries.push(entry);
    }
  }
  
  return entries.join('\n');
}

/**
 * Parse a BibTeX file and extract entries.
 * Returns a map of citation key → full BibTeX entry.
 */
function parseBibtex(content: string): Map<string, string> {
  const entries = new Map<string, string>();
  
  // Match BibTeX entries: @type{key, ... }
  // This regex handles nested braces properly
  const entryRegex = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let match;
  
  while ((match = entryRegex.exec(content)) !== null) {
    const startIdx = match.index;
    const key = match[2];
    
    // Find the matching closing brace
    let braceCount = 0;
    let endIdx = startIdx;
    let inEntry = false;
    
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inEntry = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inEntry && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    
    if (endIdx > startIdx) {
      const entry = content.slice(startIdx, endIdx).trim();
      entries.set(key, entry);
    }
  }
  
  return entries;
}

/**
 * Update database references from parsed BibTeX entries.
 * - Updates existing references if bibtex content changed
 * - Adds new references if they don't exist
 * - Does NOT remove references that are not in the BibTeX file
 */
function updateReferencesFromBibtex(database: DatabaseSchema, bibtexEntries: Map<string, string>): void {
  const existingRefs = new Map<string, KCReference>();
  for (const ref of database.references) {
    existingRefs.set(ref.id, ref);
    // Also map by bibtex citation key if different from id
    const keyMatch = ref.bibtex?.match(/@\w+\{([^,\s]+)/);
    if (keyMatch && keyMatch[1] !== ref.id) {
      existingRefs.set(keyMatch[1], ref);
    }
  }
  
  let added = 0;
  let updated = 0;
  
  for (const [key, bibtex] of bibtexEntries) {
    const existingRef = existingRefs.get(key);
    
    if (existingRef) {
      // Update existing reference - normalize the bibtex key to match our ID
      const normalizedBibtex = normalizeBibtexKey(bibtex, existingRef.id);
      let changed = false;
      if (existingRef.bibtex !== normalizedBibtex) {
        existingRef.bibtex = normalizedBibtex;
        changed = true;
      }
      // Regenerate title if it's still just the raw paper title (not a full citation)
      const rawTitle = extractTitleFromBibtex(bibtex);
      if (rawTitle && existingRef.title === rawTitle) {
        existingRef.title = buildCitationFromBibtex(bibtex, existingRef.id);
        changed = true;
      }
      // Update href if missing
      if (existingRef.href === '#') {
        const href = extractUrlFromBibtex(bibtex);
        if (href) {
          existingRef.href = href;
          changed = true;
        }
      }
      if (changed) updated++;
    } else {
      // Add new reference with normalized key
      const normalizedBibtex = normalizeBibtexKey(bibtex, key);
      const title = buildCitationFromBibtex(bibtex, key);
      const href = extractUrlFromBibtex(bibtex) || '#';
      
      database.references.push({
        id: key,
        title,
        href,
        bibtex: normalizedBibtex
      });
      added++;
    }
  }
  
  console.log(`References: ${added} added, ${updated} updated`);
}

/**
 * Extract a BibTeX field value (handles both {braced} and "quoted" values).
 */
function extractBibtexField(bibtex: string, field: string): string | null {
  const re = new RegExp(String.raw`${field}\s*=\s*\{([^}]+)\}`, 'i');
  const match = bibtex.match(re) || bibtex.match(new RegExp(String.raw`${field}\s*=\s*"([^"]+)"`, 'i'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * Extract title from BibTeX entry
 */
function extractTitleFromBibtex(bibtex: string): string | null {
  return extractBibtexField(bibtex, 'title');
}

/**
 * Build a human-readable citation string from BibTeX fields.
 * Format: "Author(s), \"Title,\" Venue, vol. V, pp. P, Year."
 */
function buildCitationFromBibtex(bibtex: string, fallbackKey: string): string {
  const author = extractBibtexField(bibtex, 'author');
  const title = extractBibtexField(bibtex, 'title');
  const journal = extractBibtexField(bibtex, 'journal');
  const booktitle = extractBibtexField(bibtex, 'booktitle');
  const volume = extractBibtexField(bibtex, 'volume');
  const pages = extractBibtexField(bibtex, 'pages');
  const year = extractBibtexField(bibtex, 'year');

  if (!title) return fallbackKey;

  const parts: string[] = [];
  if (author) {
    // Abbreviate first names: "de Colnet, Alexis and Meel, Kuldeep S." → "A. de Colnet and K. S. Meel"
    const authors = author.split(/\s+and\s+/).map(a => {
      const commaMatch = a.match(/^(.+?),\s*(.+)$/);
      if (commaMatch) {
        const last = commaMatch[1].trim();
        const firstNames = commaMatch[2].trim().split(/\s+/).map(n => n.endsWith('.') ? n : n[0] + '.').join(' ');
        return `${firstNames} ${last}`;
      }
      // "First Last" format
      const spaceParts = a.trim().split(/\s+/);
      if (spaceParts.length >= 2) {
        const last = spaceParts[spaceParts.length - 1];
        const firsts = spaceParts.slice(0, -1).map(n => n.endsWith('.') ? n : n[0] + '.').join(' ');
        return `${firsts} ${last}`;
      }
      return a.trim();
    });
    parts.push(authors.join(' and '));
  }

  parts.push(`"${title}"`);

  const venue = journal || booktitle;
  if (venue) {
    let venueStr = venue;
    if (volume) venueStr += `, vol. ${volume}`;
    if (pages) venueStr += `, pp. ${pages.replace('--', '–')}`;
    parts.push(venueStr);
  }

  if (year) parts.push(year);

  return parts.join(', ') + '.';
}

/**
 * Extract URL from BibTeX entry
 */
function extractUrlFromBibtex(bibtex: string): string | null {
  const match = bibtex.match(/url\s*=\s*\{([^}]+)\}/i) ||
                bibtex.match(/doi\s*=\s*\{([^}]+)\}/i);
  if (match) {
    const value = match[1].trim();
    // If it's a DOI, convert to URL
    if (bibtex.toLowerCase().includes('doi') && !value.startsWith('http')) {
      return `https://doi.org/${value}`;
    }
    return value;
  }
  return null;
}

// =============================================================================
// Languages LaTeX Generation and Parsing
// =============================================================================

/**
 * Generate a single language definition block.
 * 
 * Format:
 *   \begin{definition}[$NAME$]\label{def:ID}
 *   \textbf{FULL_NAME} \\
 *   DEFINITION_CONTENT \citet{REFS}?
 *   \end{definition}
 */
function generateLanguageDefinition(lang: KCLanguage): string {
  const nameLatex = languageToLatex(lang.name);
  const definition = lang.definition && lang.definition !== '-' 
    ? lang.definition 
    : '(Definition needed)';
  
  let content = `\\textbf{${escapeLatex(lang.fullName)}} \\\\
${definition}`;
  
  // Add references at the end
  if (lang.definitionRefs && lang.definitionRefs.length > 0) {
    content += ` \\citet{${lang.definitionRefs.join(',')}}`;
  }
  
  return `\\begin{definition}[${nameLatex}]\\label{def:${lang.id}}
${content}
\\end{definition}
`;
}

/**
 * Generate the full languages LaTeX document
 */
function generateLanguagesLatex(database: DatabaseSchema): string {
  const { languages } = database;
  
  // Sort languages alphabetically by name
  const sortedLanguages = [...languages].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  // Build all definitions
  const definitions = sortedLanguages
    .map(lang => generateLanguageDefinition(lang))
    .join('\n');
  
  // Build full document
  const preamble = `% =============================
% Knowledge Compilation Map - Language Definitions
% Auto-generated from database.json
% Generated: ${new Date().toISOString()}
% 
% EDITING INSTRUCTIONS:
% - Language names in brackets are auto-generated. Do NOT edit.
% - Full names (\\textbf{...}) are auto-generated. Do NOT edit.
% - Definition content (after the full name line) is EDITABLE.
% - To sync back to JSON, run: npx tsx scripts/latex-bijection.ts --to-json
% =============================
\\documentclass[11pt]{article}

% -------- Packages --------
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{mathtools}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{cleveref}
\\usepackage{xcolor}
\\usepackage{natbib}

% -------- Hyperref setup --------
\\hypersetup{
  colorlinks=true,
  linkcolor=blue,
  citecolor=blue,
  urlcolor=blue
}

% -------- Theorem styles --------
\\theoremstyle{definition}
\\newtheorem{definition}{Definition}

% -------- Handy macros --------
\\newcommand{\\R}{\\mathbb{R}}
\\newcommand{\\N}{\\mathbb{N}}
\\newcommand{\\eps}{\\varepsilon}

% -------- Title info --------
\\title{Knowledge Compilation Map: Language Definitions}
\\date{\\today}

\\begin{document}
\\maketitle

`;

  const postamble = `
% =============================
% Bibliography
% =============================
\\bibliographystyle{plainnat}
\\bibliography{refs}

\\end{document}
`;

  return preamble + definitions + postamble;
}

/**
 * Parsed language definition from LaTeX
 */
interface ParsedLanguageDefinition {
  id: string;
  name: string;
  fullName: string;
  definition: string;
  definitionRefs: string[];
}

/**
 * Parse language definitions from LaTeX file.
 * 
 * Expected format:
 *   \begin{definition}[$NAME$]\label{def:ID}
 *   \textbf{FULL_NAME} \\
 *   DEFINITION_CONTENT \citet{REFS}?
 *   \end{definition}
 */
function parseLanguagesLatex(latexContent: string): ParsedLanguageDefinition[] {
  const definitions: ParsedLanguageDefinition[] = [];
  const lines = latexContent.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for definition start: \begin{definition}[$NAME$]\label{def:ID}
    const defMatch = line.match(/\\begin\{definition\}\[([^\]]+)\]\\label\{def:([^}]+)\}/);
    if (defMatch) {
      const nameLatex = defMatch[1];
      const id = defMatch[2];
      const name = parseLanguageName(nameLatex);
      
      // Collect definition content until \end{definition}
      let content = '';
      i++;
      while (i < lines.length && !lines[i].includes('\\end{definition}')) {
        content += lines[i] + '\n';
        i++;
      }
      i++; // Skip \end{definition}
      
      // Parse the content
      content = content.trim();
      
      // Extract full name from \textbf{...} (handles nested braces)
      let fullName = '';
      const extracted = extractBraceContent(content, '\\textbf{');
      if (extracted) {
        fullName = extracted.content;
        // Remove the fullName line (including the \\)
        content = extracted.rest.replace(/^\s*\\\\\s*/, '').trim();
      }
      
      // Extract references from the end
      let definitionRefs: string[] = [];
      const citeMatch = content.match(/\\citet?\{([^}]+)\}\s*$/);
      if (citeMatch) {
        definitionRefs = citeMatch[1].split(',').map(s => s.trim());
        content = content.slice(0, citeMatch.index).trim();
      }
      
      definitions.push({
        id,
        name,
        fullName,
        definition: content,
        definitionRefs
      });
      
      continue;
    }
    
    i++;
  }
  
  return definitions;
}

/**
 * Update database languages from parsed definitions.
 */
function updateLanguagesFromLatex(database: DatabaseSchema, parsedDefs: ParsedLanguageDefinition[]): void {
  // Build ID to language map
  const idToLang = new Map<string, KCLanguage>();
  for (const lang of database.languages) {
    idToLang.set(lang.id, lang);
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const def of parsedDefs) {
    const lang = idToLang.get(def.id);
    
    if (!lang) {
      console.warn(`Unknown language ID in LaTeX: ${def.id} (${def.name})`);
      skipped++;
      continue;
    }
    
    // Update definition (the editable part)
    if (def.definition && def.definition !== '(Definition needed)') {
      lang.definition = def.definition;
    }
    
    // Update definition refs
    if (def.definitionRefs.length > 0) {
      lang.definitionRefs = def.definitionRefs;
    }
    
    updated++;
  }
  
  console.log(`Updated ${updated} language definitions, skipped ${skipped}`);
}

// =============================================================================
// Separating Functions LaTeX Generation and Parsing
// =============================================================================

/**
 * Generate a single separating function definition block.
 * 
 * Format:
 *   \begin{definition}[SHORTNAME]\label{sf:SAFE_LABEL}
 *   \textbf{NAME} \\
 *   DESCRIPTION \citet{REFS}?
 *   \end{definition}
 */
function generateSepFuncDefinition(sf: KCSeparatingFunction): string {
  const safeLabel = sf.shortName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const description = sf.description && sf.description !== '-'
    ? sf.description
    : '(Description needed)';

  let content = `\\textbf{${sf.name}} \\\\
${description}`;

  if (sf.refs && sf.refs.length > 0) {
    content += ` \\citet{${sf.refs.join(',')}}`;
  }

  return `\\begin{definition}[${escapeLatex(sf.shortName)}]\\label{sf:${safeLabel}}
${content}
\\end{definition}
`;
}

/**
 * Generate the full separating functions LaTeX document.
 */
function generateSepFuncsLatex(database: DatabaseSchema): string {
  const { separatingFunctions } = database;

  const sorted = [...separatingFunctions].sort((a, b) =>
    a.shortName.localeCompare(b.shortName)
  );

  const definitions = sorted
    .map(sf => generateSepFuncDefinition(sf))
    .join('\n');

  const preamble = `% =============================
% Knowledge Compilation Map - Separating Functions
% Auto-generated from database.json
% Generated: ${new Date().toISOString()}
%
% EDITING INSTRUCTIONS:
% - Short names in brackets are auto-generated identifiers. Do NOT edit.
% - Names (\\textbf{...}) are EDITABLE (may contain LaTeX math).
% - Description content (after the name line) is EDITABLE.
% - To sync back to JSON, run: npx tsx scripts/latex-bijection.ts --to-json
% =============================
\\documentclass[11pt]{article}

% -------- Packages --------
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{mathtools}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{cleveref}
\\usepackage{xcolor}
\\usepackage{natbib}

% -------- Hyperref setup --------
\\hypersetup{
  colorlinks=true,
  linkcolor=blue,
  citecolor=blue,
  urlcolor=blue
}

% -------- Theorem styles --------
\\theoremstyle{definition}
\\newtheorem{definition}{Definition}

% -------- Handy macros --------
\\newcommand{\\R}{\\mathbb{R}}
\\newcommand{\\N}{\\mathbb{N}}
\\newcommand{\\eps}{\\varepsilon}

% -------- Title info --------
\\title{Knowledge Compilation Map: Separating Functions}
\\date{\\today}

\\begin{document}
\\maketitle

`;

  const postamble = `
% =============================
% Bibliography
% =============================
\\bibliographystyle{plainnat}
\\bibliography{refs}

\\end{document}
`;

  return preamble + definitions + postamble;
}

/**
 * Parsed separating function from LaTeX
 */
interface ParsedSepFunc {
  shortName: string;
  name: string;
  description: string;
  refs: string[];
}

/**
 * Parse separating function definitions from LaTeX file.
 *
 * Expected format:
 *   \begin{definition}[SHORTNAME]\label{sf:SAFE_LABEL}
 *   \textbf{NAME} \\
 *   DESCRIPTION \citet{REFS}?
 *   \end{definition}
 */
function parseSepFuncsLatex(latexContent: string): ParsedSepFunc[] {
  const results: ParsedSepFunc[] = [];
  const lines = latexContent.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for definition start: \begin{definition}[SHORTNAME]\label{sf:...}
    const defMatch = line.match(/\\begin\{definition\}\[([^\]]+)\]\\label\{sf:([^}]+)\}/);
    if (defMatch) {
      const shortName = defMatch[1];

      // Collect definition content until \end{definition}
      let content = '';
      i++;
      while (i < lines.length && !lines[i].includes('\\end{definition}')) {
        content += lines[i] + '\n';
        i++;
      }
      i++; // Skip \end{definition}

      content = content.trim();

      // Extract name from \textbf{...} (handles nested braces)
      let name = '';
      const nameExtracted = extractBraceContent(content, '\\textbf{');
      if (nameExtracted) {
        name = nameExtracted.content;
        content = nameExtracted.rest.replace(/^\s*\\\\\s*/, '').trim();
      }

      // Extract references from the end
      let refs: string[] = [];
      const citeMatch = content.match(/\\citet?\{([^}]+)\}\s*$/);
      if (citeMatch) {
        refs = citeMatch[1].split(',').map(s => s.trim());
        content = content.slice(0, citeMatch.index).trim();
      }

      results.push({
        shortName,
        name,
        description: content,
        refs
      });

      continue;
    }

    i++;
  }

  return results;
}

/**
 * Update database separating functions from parsed LaTeX definitions.
 */
function updateSepFuncsFromLatex(database: DatabaseSchema, parsed: ParsedSepFunc[]): void {
  const byShortName = new Map<string, KCSeparatingFunction>();
  for (const sf of database.separatingFunctions) {
    byShortName.set(sf.shortName, sf);
  }

  let updated = 0;
  let skipped = 0;

  for (const p of parsed) {
    const sf = byShortName.get(p.shortName);

    if (!sf) {
      console.warn(`Unknown separating function in LaTeX: ${p.shortName}`);
      skipped++;
      continue;
    }

    // Update name (math content, editable)
    if (p.name && p.name.length > 0) {
      sf.name = p.name;
    }

    // Update description (editable)
    if (p.description && p.description !== '(Description needed)') {
      sf.description = p.description;
    }

    // Update refs
    if (p.refs.length > 0) {
      sf.refs = p.refs;
    }

    updated++;
  }

  console.log(`Updated ${updated} separating functions, skipped ${skipped}`);
}

// =============================================================================
// Queries & Transformations LaTeX Generation and Parsing
// =============================================================================

/**
 * Operation definition lookup loaded from database.
 */
interface OpDef {
  code: string;
  label: string;
  description?: string;
}

/**
 * A single operation support claim to be rendered as LaTeX.
 */
interface OpClaim {
  langId: string;
  langName: string;
  /** Safe key used in the database (e.g., AND_C, NOT_C) */
  opSafeKey: string;
  /** Display code (e.g., ∧C, ¬C) - only for display in claim text */
  opCode: string;
  opLabel: string;
  complexity: string;
  caveat: string;
  description: string;
  refs: string[];
  derived: boolean;
}

/**
 * Extract non-derived operation claims from the database.
 * @param opType 'queries' or 'transformations'
 */
function extractOpClaims(
  database: DatabaseSchema,
  opType: 'queries' | 'transformations'
): OpClaim[] {
  const opDefs = (database.operations as Record<string, Record<string, OpDef>>)[opType];
  const claims: OpClaim[] = [];

  for (const lang of database.languages) {
    const supportMap: KCOpSupportMap | undefined = lang.properties?.[opType];
    if (!supportMap) continue;

    for (const [safeKey, opDef] of Object.entries(opDefs)) {
      const support = supportMap[safeKey] || supportMap[opDef.code];
      if (!support) continue;

      // Skip derived entries
      if (support.derived) continue;

      // Skip unknown-to-us (no claim to make)
      if (support.complexity === 'unknown-to-us') continue;

      claims.push({
        langId: lang.id,
        langName: lang.name,
        opSafeKey: safeKey,
        opCode: opDef.code,
        opLabel: opDef.label,
        complexity: support.complexity,
        caveat: support.caveat || '',
        description: support.description || '',
        refs: support.refs || [],
        derived: false
      });
    }
  }

  return claims;
}

/**
 * Generate a single operation support claim block.
 *
 * Format:
 *   % lang=LANG_ID, op=OP_SAFE_KEY
 *   \begin{claim}
 *   $LANG$ supports $OP_LABEL$ COMPLEXITY_TEXT (unless CAVEAT)? \citet{REFS}?
 *   \end{claim}
 *   \begin{claimdescription}
 *   DESCRIPTION (EDITABLE)
 *   \end{claimdescription}
 */
function generateOpClaim(claim: OpClaim): string {
  const langLatex = languageToLatex(claim.langName);
  const complexityText = CANONICAL_OP_COMPLEXITIES[claim.complexity];

  if (!complexityText) {
    console.warn(`Unknown operation complexity: ${claim.complexity}`);
    return '';
  }

  let claimText = `${langLatex} supports ${claim.opLabel} ${complexityText}`;

  if (claim.caveat) {
    claimText += ` unless ${claim.caveat}`;
  }

  if (claim.refs.length > 0) {
    claimText += ` \\citet{${claim.refs.join(',')}}`;
  }

  const description = claim.description || '(Description needed)';

  return `% lang=${claim.langId}, op=${claim.opSafeKey}
\\begin{claim}
${claimText}
\\end{claim}
\\begin{claimdescription}
${description}
\\end{claimdescription}
`;
}

/**
 * Group operation claims by reference, same pattern as edge claims.
 */
function groupOpClaimsByReference(claims: OpClaim[]): Map<string, OpClaim[]> {
  const refCounts = new Map<string, number>();

  for (const claim of claims) {
    for (const ref of claim.refs) {
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    }
  }

  const sortedRefs = [...refCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ref]) => ref);

  const grouped = new Map<string, OpClaim[]>();
  const usedClaims = new Set<OpClaim>();

  grouped.set('__NO_REFERENCE__', []);
  for (const ref of sortedRefs) {
    grouped.set(ref, []);
  }

  for (const claim of claims) {
    if (claim.refs.length === 0) {
      grouped.get('__NO_REFERENCE__')!.push(claim);
      usedClaims.add(claim);
      continue;
    }

    // Find the most frequent reference for this claim
    for (const ref of sortedRefs) {
      if (claim.refs.includes(ref) && !usedClaims.has(claim)) {
        grouped.get(ref)!.push(claim);
        usedClaims.add(claim);
        break;
      }
    }
  }

  // Remove empty groups
  for (const [key, value] of grouped) {
    if (value.length === 0) grouped.delete(key);
  }

  return grouped;
}

/**
 * Build a section of operation claims grouped by reference.
 */
function buildOpSection(refId: string, refClaims: OpClaim[], refMap: Map<string, KCReference>): string {
  let sectionTitle: string;

  if (refId === '__NO_REFERENCE__') {
    sectionTitle = 'No Reference';
  } else {
    const ref = refMap.get(refId);
    sectionTitle = ref ? ref.title.slice(0, 80) + (ref.title.length > 80 ? '...' : '') : refId;
  }

  // Sort by language name, then operation code
  refClaims.sort((a, b) => {
    const langCmp = a.langName.localeCompare(b.langName);
    if (langCmp !== 0) return langCmp;
    return a.opCode.localeCompare(b.opCode);
  });

  const claimTexts = refClaims
    .map(c => generateOpClaim(c))
    .filter(c => c.length > 0)
    .join('\n');

  if (claimTexts.length === 0) return '';

  return `% =============================
\\section{${escapeLatex(sectionTitle)}}
% Reference ID: ${refId}
% =============================
${claimTexts}`;
}

/**
 * Generate the full operations LaTeX document.
 * @param opType 'queries' or 'transformations'
 * @param title Document title
 */
function generateOpsLatex(database: DatabaseSchema, opType: 'queries' | 'transformations', title: string): string {
  const claims = extractOpClaims(database, opType);
  const grouped = groupOpClaimsByReference(claims);

  const refMap = new Map<string, KCReference>();
  for (const ref of database.references) {
    refMap.set(ref.id, ref);
  }

  const sections: string[] = [];
  let noRefSection: string | null = null;

  for (const [refId, refClaims] of grouped) {
    const section = buildOpSection(refId, refClaims, refMap);
    if (!section) continue;

    if (refId === '__NO_REFERENCE__') {
      noRefSection = section;
    } else {
      sections.push(section);
    }
  }

  if (noRefSection) {
    sections.push(noRefSection);
  }

  const opTypeLabel = opType === 'queries' ? 'Query' : 'Transformation';

  const preamble = `% =============================
% Knowledge Compilation Map - ${opTypeLabel} Support Claims
% Auto-generated from database.json
% Generated: ${new Date().toISOString()}
%
% EDITING INSTRUCTIONS:
% - Claims (\\begin{claim}...\\end{claim}) are auto-generated. Do NOT edit.
% - Descriptions (\\begin{claimdescription}...\\end{claimdescription}) are EDITABLE.
% - Derived entries are omitted; they will be regenerated by propagation.
% - To sync back to JSON, run: npx tsx scripts/latex-bijection.ts --to-json
% =============================
\\documentclass[11pt]{article}

% -------- Packages --------
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{mathtools}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{cleveref}
\\usepackage{xcolor}
\\usepackage{natbib}

% -------- Hyperref setup --------
\\hypersetup{
  colorlinks=true,
  linkcolor=blue,
  citecolor=blue,
  urlcolor=blue
}

% -------- Theorem styles --------
\\theoremstyle{plain}
\\newtheorem{claim}{Claim}[section]

\\theoremstyle{definition}
\\newtheorem{definition}[claim]{Definition}

% -------- Description environment --------
\\newenvironment{claimdescription}{%
  \\par\\noindent\\ignorespaces
}{\\par}

% -------- Handy macros --------
\\newcommand{\\R}{\\mathbb{R}}
\\newcommand{\\N}{\\mathbb{N}}
\\newcommand{\\eps}{\\varepsilon}

% -------- Title info --------
\\title{Knowledge Compilation Map: ${opTypeLabel} Support}
\\date{\\today}

\\begin{document}
\\maketitle

\\tableofcontents
\\newpage

`;

  const postamble = `
% =============================
% Bibliography
% =============================
\\bibliographystyle{plainnat}
\\bibliography{refs}

\\end{document}
`;

  return preamble + sections.join('\n\n') + postamble;
}

// =============================================================================
// Queries & Transformations LaTeX Parsing
// =============================================================================

/**
 * Parsed operation support claim from LaTeX.
 */
interface ParsedOpClaim {
  langId: string;
  opCode: string;
  complexity: string;
  caveat: string;
  description: string;
  refs: string[];
}

/**
 * Parse operation support claims from LaTeX file.
 *
 * Expected format:
 *   % lang=LANG_ID, op=OP_SAFE_KEY
 *   \begin{claim}
 *   $LANG$ supports OP_LABEL COMPLEXITY_TEXT (unless CAVEAT)? (\citet{REFS})?
 *   \end{claim}
 *   \begin{claimdescription}
 *   DESCRIPTION
 *   \end{claimdescription}
 */
function parseOpsLatex(latexContent: string): ParsedOpClaim[] {
  const results: ParsedOpClaim[] = [];
  const lines = latexContent.split('\n');
  let i = 0;

  // Track the most recent metadata comment
  let pendingLangId: string | null = null;
  let pendingOpCode: string | null = null;

  while (i < lines.length) {
    const line = lines[i];

    // Look for metadata comment: % lang=..., op=...
    const metaMatch = line.match(/^%\s*lang=([^,]+),\s*op=(.+)$/);
    if (metaMatch) {
      pendingLangId = metaMatch[1].trim();
      pendingOpCode = metaMatch[2].trim();
      i++;
      continue;
    }

    // Look for claim start: \begin{claim} (without optional args for op claims)
    if (line.includes('\\begin{claim}') && pendingLangId && pendingOpCode) {
      const langId = pendingLangId;
      const opCode = pendingOpCode;
      pendingLangId = null;
      pendingOpCode = null;

      // Collect claim content until \end{claim}
      let claimContent = '';
      i++;
      while (i < lines.length && !lines[i].includes('\\end{claim}')) {
        claimContent += lines[i] + '\n';
        i++;
      }
      i++; // Skip \end{claim}

      // Find and collect description content
      let descContent = '';
      while (i < lines.length && !lines[i].includes('\\begin{claimdescription}')) {
        if (lines[i].trim() && !lines[i].trim().startsWith('%')) {
          break; // Unexpected content
        }
        i++;
      }

      if (i < lines.length && lines[i].includes('\\begin{claimdescription}')) {
        i++; // Skip \begin{claimdescription}
        while (i < lines.length && !lines[i].includes('\\end{claimdescription}')) {
          descContent += lines[i] + '\n';
          i++;
        }
        i++; // Skip \end{claimdescription}
      }

      // Parse the claim body to extract complexity, caveat, refs
      let body = claimContent.trim();

      // Extract citation
      let refs: string[] = [];
      const citeMatch = body.match(/\\citet?\{([^}]+)\}\s*$/);
      if (citeMatch) {
        refs = citeMatch[1].split(',').map(s => s.trim());
        body = body.slice(0, citeMatch.index).trim();
      }

      // Extract caveat
      let caveat = '';
      const unlessMatch = body.match(/\s+unless\s+(.+)$/i);
      if (unlessMatch) {
        caveat = unlessMatch[1].trim();
        body = body.slice(0, unlessMatch.index).trim();
      }

      // Determine complexity from canonical text
      let complexity: string | null = null;
      for (const [code, text] of Object.entries(CANONICAL_OP_COMPLEXITIES)) {
        if (body.includes(text)) {
          complexity = code;
          break;
        }
      }

      if (!complexity) {
        console.warn(`Could not determine complexity from op claim body: ${body}`);
        i++;
        continue;
      }

      results.push({
        langId,
        opCode,
        complexity,
        caveat,
        description: descContent.trim(),
        refs
      });

      continue;
    }

    i++;
  }

  return results;
}

/**
 * Update database operation support from parsed LaTeX claims.
 * @param opType 'queries' or 'transformations'
 */
function updateOpsFromLatex(
  database: DatabaseSchema,
  parsedClaims: ParsedOpClaim[],
  opType: 'queries' | 'transformations'
): void {
  const opDefs = (database.operations as Record<string, Record<string, OpDef>>)[opType];

  // Build set of valid safe keys for validation
  const validSafeKeys = new Set(Object.keys(opDefs));

  // Build language ID lookup
  const idToLang = new Map<string, KCLanguage>();
  for (const lang of database.languages) {
    idToLang.set(lang.id, lang);
  }

  let updated = 0;
  let skipped = 0;

  for (const claim of parsedClaims) {
    const lang = idToLang.get(claim.langId);
    if (!lang) {
      console.warn(`Unknown language ID in ops LaTeX: ${claim.langId}`);
      skipped++;
      continue;
    }

    // The opCode from LaTeX is already the safe key (e.g., AND_C, NOT_C)
    const safeKey = claim.opCode;
    if (!validSafeKeys.has(safeKey)) {
      console.warn(`Unknown operation safe key in ops LaTeX: ${safeKey}`);
      skipped++;
      continue;
    }

    // Ensure properties map exists
    if (!lang.properties) {
      lang.properties = {};
    }
    if (!lang.properties[opType]) {
      lang.properties[opType] = {};
    }

    const supportMap = lang.properties[opType]!;
    const existing = supportMap[safeKey];

    if (existing) {
      // Update existing entry — always sync complexity from LaTeX
      existing.complexity = claim.complexity;
      if (claim.description && claim.description !== '(Description needed)') {
        existing.description = claim.description;
      }
      if (claim.refs.length > 0) {
        existing.refs = claim.refs;
      }
      if (claim.caveat) {
        existing.caveat = claim.caveat;
      } else if ('caveat' in existing) {
        delete existing.caveat;
      }
    } else {
      // Create new entry
      const newSupport: KCOpSupport = {
        complexity: claim.complexity,
        refs: claim.refs,
      };
      if (claim.caveat) newSupport.caveat = claim.caveat;
      if (claim.description && claim.description !== '(Description needed)') {
        newSupport.description = claim.description;
      }
      supportMap[safeKey] = newSupport;
    }

    updated++;
  }

  console.log(`Updated ${updated} ${opType} entries, skipped ${skipped}`);
}

// =============================================================================
// CLI
// =============================================================================

function printUsage(): void {
  console.log(`
Knowledge Compilation Map - LaTeX Bijection Script

Usage:
  npx tsx scripts/latex-bijection.ts --to-latex
  npx tsx scripts/latex-bijection.ts --to-json
  npx tsx scripts/latex-bijection.ts --normalize-refs

Options:
  --to-latex      Convert database.json to LaTeX files
  --to-json       Convert LaTeX files back to database.json
  --normalize-refs Normalize all BibTeX keys in database to match reference IDs
  -h, --help      Show this help message

Output files (--to-latex):
  docs/claims.tex               - Succinctness claims and proofs
  docs/languages.tex            - Language definitions
  docs/queries.tex              - Query operation support claims
  docs/transformations.tex      - Transformation operation support claims
  docs/separating-functions.tex - Separating function definitions
  docs/refs.bib                 - BibTeX references

Input files (--to-json):
  docs/claims.tex               - Updates adjacency matrix descriptions
  docs/languages.tex            - Updates language definitions
  docs/queries.tex              - Updates query operation support
  docs/transformations.tex      - Updates transformation operation support
  docs/separating-functions.tex - Updates separating functions
  docs/refs.bib                 - Updates references

Database: src/lib/data/database.json

Examples:
  npx tsx scripts/latex-bijection.ts --to-latex
  npx tsx scripts/latex-bijection.ts --to-json
  npx tsx scripts/latex-bijection.ts --normalize-refs
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }
  
  const toLatex = args.includes('--to-latex');
  const toJson = args.includes('--to-json');
  const normalizeRefs = args.includes('--normalize-refs');
  
  const modeCount = [toLatex, toJson, normalizeRefs].filter(Boolean).length;
  
  if (modeCount > 1) {
    console.error('Error: Cannot specify multiple modes (--to-latex, --to-json, --normalize-refs)');
    process.exit(1);
  }
  
  if (modeCount === 0) {
    console.error('Error: Must specify --to-latex, --to-json, or --normalize-refs');
    printUsage();
    process.exit(1);
  }
  
  if (normalizeRefs) {
    // Normalize all BibTeX keys in database
    console.log('=== Normalizing BibTeX Keys ===\n');
    console.log(`Reading database from: ${DATABASE_PATH}`);
    
    const database = loadDatabase();
    
    console.log(`Found ${database.references.length} references\n`);
    
    let updated = 0;
    for (const ref of database.references) {
      if (ref.bibtex) {
        const normalized = normalizeBibtexKey(ref.bibtex, ref.id);
        if (normalized !== ref.bibtex) {
          console.log(`Normalized: ${ref.id}`);
          ref.bibtex = normalized;
          updated++;
        }
      }
    }
    
    console.log(`\nUpdated ${updated} references`);
    
    if (updated > 0) {
      console.log(`\nWriting database to: ${DATABASE_PATH}`);
      saveDatabase(database);
    }
    
    console.log('\n=== Done ===');
    return;
  }
  
  if (toLatex) {
    // JSON → LaTeX + BibTeX
    const claimsPath = DEFAULT_LATEX_OUTPUT;
    const languagesPath = DEFAULT_LANGUAGES_OUTPUT;
    const bibtexPath = DEFAULT_BIBTEX_OUTPUT;
    const queriesPath = DEFAULT_QUERIES_OUTPUT;
    const transformsPath = DEFAULT_TRANSFORMS_OUTPUT;
    const sepFuncsPath = DEFAULT_SEPFUNCS_OUTPUT;
    
    console.log('=== JSON → LaTeX Conversion ===\n');
    console.log(`Reading database from: ${DATABASE_PATH}`);
    
    const database = loadDatabase();
    
    console.log(`Found ${database.languages.length} languages`);
    console.log(`Found ${database.references.length} references`);
    console.log(`Found ${database.separatingFunctions.length} separating functions`);
    
    // Generate and write claims LaTeX
    const claimsLatex = generateLatex(database);
    fs.writeFileSync(claimsPath, claimsLatex, 'utf-8');
    console.log(`\nWrote claims to: ${claimsPath}`);
    
    // Generate and write languages LaTeX
    const languagesLatex = generateLanguagesLatex(database);
    fs.writeFileSync(languagesPath, languagesLatex, 'utf-8');
    console.log(`Wrote language definitions to: ${languagesPath}`);
    
    // Generate and write queries LaTeX
    const queriesLatex = generateOpsLatex(database, 'queries', 'Query');
    fs.writeFileSync(queriesPath, queriesLatex, 'utf-8');
    console.log(`Wrote query support claims to: ${queriesPath}`);

    // Generate and write transformations LaTeX
    const transformsLatex = generateOpsLatex(database, 'transformations', 'Transformation');
    fs.writeFileSync(transformsPath, transformsLatex, 'utf-8');
    console.log(`Wrote transformation support claims to: ${transformsPath}`);

    // Generate and write separating functions LaTeX
    const sepFuncsLatex = generateSepFuncsLatex(database);
    fs.writeFileSync(sepFuncsPath, sepFuncsLatex, 'utf-8');
    console.log(`Wrote separating functions to: ${sepFuncsPath}`);

    // Generate and write BibTeX
    const bibtex = generateBibtex(database);
    fs.writeFileSync(bibtexPath, bibtex, 'utf-8');
    console.log(`Wrote BibTeX to: ${bibtexPath}`);
    
    console.log('\n=== Done ===');
  }
  
  if (toJson) {
    // LaTeX → JSON
    const claimsPath = DEFAULT_LATEX_OUTPUT;
    const languagesPath = DEFAULT_LANGUAGES_OUTPUT;
    const bibtexPath = DEFAULT_BIBTEX_OUTPUT;
    const queriesPath = DEFAULT_QUERIES_OUTPUT;
    const transformsPath = DEFAULT_TRANSFORMS_OUTPUT;
    const sepFuncsPath = DEFAULT_SEPFUNCS_OUTPUT;
    
    console.log('=== LaTeX → JSON Conversion ===\n');
    
    console.log(`Reading database from: ${DATABASE_PATH}`);
    const database = loadDatabase();
    
    // Update from BibTeX if file exists
    if (fs.existsSync(bibtexPath)) {
      console.log(`\nReading BibTeX from: ${bibtexPath}`);
      const bibtexContent = fs.readFileSync(bibtexPath, 'utf-8');
      const bibtexEntries = parseBibtex(bibtexContent);
      console.log(`Parsed ${bibtexEntries.size} BibTeX entries`);
      
      console.log(`Updating references...`);
      updateReferencesFromBibtex(database, bibtexEntries);
    } else {
      console.log(`\nNote: BibTeX file not found: ${bibtexPath} (skipping reference updates)`);
    }
    
    // Update from claims.tex if file exists
    if (fs.existsSync(claimsPath)) {
      console.log(`\nReading claims from: ${claimsPath}`);
      const claimsContent = fs.readFileSync(claimsPath, 'utf-8');
      const claims = parseLatex(claimsContent);
      console.log(`Parsed ${claims.length} claims`);
      
      console.log(`Updating adjacency matrix...`);
      updateDatabase(database, claims);
    } else {
      console.log(`\nNote: Claims file not found: ${claimsPath} (skipping claim updates)`);
    }
    
    // Update from languages.tex if file exists
    if (fs.existsSync(languagesPath)) {
      console.log(`\nReading language definitions from: ${languagesPath}`);
      const languagesContent = fs.readFileSync(languagesPath, 'utf-8');
      const languageDefs = parseLanguagesLatex(languagesContent);
      console.log(`Parsed ${languageDefs.length} language definitions`);
      
      console.log(`Updating language definitions...`);
      updateLanguagesFromLatex(database, languageDefs);
    } else {
      console.log(`\nNote: Languages file not found: ${languagesPath} (skipping language definition updates)`);
    }

    // Update from queries.tex if file exists
    if (fs.existsSync(queriesPath)) {
      console.log(`\nReading query claims from: ${queriesPath}`);
      const queriesContent = fs.readFileSync(queriesPath, 'utf-8');
      const queryClaims = parseOpsLatex(queriesContent);
      console.log(`Parsed ${queryClaims.length} query claims`);

      console.log(`Updating query operation support...`);
      updateOpsFromLatex(database, queryClaims, 'queries');
    } else {
      console.log(`\nNote: Queries file not found: ${queriesPath} (skipping query updates)`);
    }

    // Update from transformations.tex if file exists
    if (fs.existsSync(transformsPath)) {
      console.log(`\nReading transformation claims from: ${transformsPath}`);
      const transformsContent = fs.readFileSync(transformsPath, 'utf-8');
      const transformClaims = parseOpsLatex(transformsContent);
      console.log(`Parsed ${transformClaims.length} transformation claims`);

      console.log(`Updating transformation operation support...`);
      updateOpsFromLatex(database, transformClaims, 'transformations');
    } else {
      console.log(`\nNote: Transformations file not found: ${transformsPath} (skipping transformation updates)`);
    }

    // Update from separating-functions.tex if file exists
    if (fs.existsSync(sepFuncsPath)) {
      console.log(`\nReading separating functions from: ${sepFuncsPath}`);
      const sepFuncsContent = fs.readFileSync(sepFuncsPath, 'utf-8');
      const parsedSepFuncs = parseSepFuncsLatex(sepFuncsContent);
      console.log(`Parsed ${parsedSepFuncs.length} separating functions`);

      console.log(`Updating separating functions...`);
      updateSepFuncsFromLatex(database, parsedSepFuncs);
    } else {
      console.log(`\nNote: Separating functions file not found: ${sepFuncsPath} (skipping sep func updates)`);
    }
    
    // Write updated database
    console.log(`\nWriting database to: ${DATABASE_PATH}`);
    saveDatabase(database);
    
    console.log('\n=== Running refresh-derived.ts to propagate changes ===\n');
    
    // Import and run refresh-derived logic
    const { execSync } = await import('child_process');
    try {
      execSync('npx tsx scripts/refresh-derived.ts', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit' 
      });
    } catch (e) {
      console.error('Warning: Failed to run refresh-derived.ts');
    }
    
    console.log('\n=== Done ===');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
