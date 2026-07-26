import type {
  DirectedSuccinctnessRelation,
  FilteredGraphData,
  GraphData,
  KCOpSupport,
  KCLanguage,
  NodePosition,
  ViewMode
} from '../types.js';
import { QUERIES, TRANSFORMATIONS } from '../data/operations.js';
import { normalizeEdgePairs } from './graph-layout.js';
import { compareByCanonicalOrder } from './canonical-order.js';

export type LatexExport = {
  filename: string;
  content: string;
};

export type LatexExportOptions = {
  nodePositions?: Record<string, NodePosition>;
};

const POSITIVE_COMPILATION_STATUSES = new Set([
  'poly',
  'unknown-poly-quasi',
  'no-poly-quasi'
]);

const OPERATION_MACROS: Record<string, string> = {
  CO: '\\CO',
  VA: '\\VA',
  CE: '\\CE',
  IM: '\\IM',
  EQ: '\\EQ',
  SE: '\\SE',
  CT: '\\CT',
  ME: '\\ME',
  CD: '\\CD',
  FO: '\\FO',
  SFO: '\\SFO',
  NOT_C: '\\NOTC',
  AND_C: '\\ANDC',
  AND_BC: '\\ANDBC',
  OR_C: '\\ORC',
  OR_BC: '\\ORBC'
};

const GRAPH_TIPS: Record<string, string> = {
  poly: 'Stealth',
  'no-poly-unknown-quasi': 'Bar',
  'no-poly-quasi': 'Bar',
  'unknown-poly-quasi': 'Stealth[open]',
  'unknown-both': 'Square[open]',
  unknown: 'Square[open]',
  'no-quasi': 'Square',
  'not-poly': 'Square',
  'unknown-to-us': 'Circle[open]'
};

function latexLanguage(name: string): string {
  const familyMatch = name.match(/^(.+)\$_(.+)\$$/);
  if (familyMatch) {
    return '\\langfam{' + familyMatch[1].replace(/\$/g, '') + '}{' + familyMatch[2].replace(/\$/g, '') + '}';
  }
  return '\\langref{' + name.replace(/\$/g, '').replace(/_/g, '\\_') + '}';
}

function latexGraphLabel(language: KCLanguage): string {
  const suffix = language.visual?.labelSuffix?.trim();
  if (!suffix) return latexLanguage(language.name);
  const suffixLines = suffix
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line
      .replace(/\$([^$]+)\$/g, '\\ensuremath{$1}')
      .replace(/✓/g, '\\ensuremath{\\checkmark}')
      .replace(/○/g, '\\ensuremath{\\circ}')
      .replace(/●/g, '\\ensuremath{\\bullet}'));
  return [latexLanguage(language.name), ...suffixLines].join('\\\\[-1pt]');
}

function visibleLanguageIds(data: GraphData | FilteredGraphData): string[] {
  const visible = 'visibleLanguageIds' in data
    ? data.visibleLanguageIds
    : new Set(data.languages.map((language) => language.id));
  const languageById = new Map(data.languages.map((language) => [language.id, language]));

  const hasPositiveCompilation = (sourceId: string, targetId: string): boolean => {
    const sourceIndex = data.adjacencyMatrix.indexByLanguage[sourceId];
    const targetIndex = data.adjacencyMatrix.indexByLanguage[targetId];
    if (sourceIndex === undefined || targetIndex === undefined) return false;
    const status = data.adjacencyMatrix.matrix[sourceIndex]?.[targetIndex]?.status;
    return Boolean(status && POSITIVE_COMPILATION_STATUSES.has(status));
  };

  return data.adjacencyMatrix.languageIds
    .filter((id) => visible.has(id) && languageById.has(id))
    .sort((a, b) => {
      const getName = (id: string) => languageById.get(id)?.name.toLowerCase() ?? id;
      return compareByCanonicalOrder(a, b, getName, {
        isNewLanguage: () => false,
        getCurrentIndex: (id) => data.adjacencyMatrix.indexByLanguage[id] ?? 0,
        hasPositiveCompilation
      });
    });
}

function languagesForIds(data: GraphData | FilteredGraphData, ids: string[]): KCLanguage[] {
  const languageById = new Map(data.languages.map((language) => [language.id, language]));
  return ids.flatMap((id) => {
    const language = languageById.get(id);
    return language ? [language] : [];
  });
}

function isCollapsed(data: GraphData | FilteredGraphData): boolean {
  return data.complexities.poly?.notation === '$\\leq$';
}

function numeric(value: number): string {
  const rounded = Math.abs(value) < 0.0005 ? 0 : value;
  return rounded.toFixed(3).replace(/\.?0+$/, '');
}

function languageMacros(): string {
  return [
    '% Override these before \\input if your paper has its own language-name style.',
    '\\providecommand{\\langref}[1]{\\textbf{#1}}',
    '\\providecommand{\\langfam}[2]{\\textbf{#1$_{#2}$}}'
  ].join('\n');
}

function operationMacros(): string {
  return [
    '% Fallback operation labels; existing definitions in the surrounding paper take precedence.',
    '\\providecommand{\\CO}{CO}',
    '\\providecommand{\\VA}{VA}',
    '\\providecommand{\\CE}{CE}',
    '\\providecommand{\\IM}{IM}',
    '\\providecommand{\\EQ}{EQ}',
    '\\providecommand{\\SE}{SE}',
    '\\providecommand{\\CT}{CT}',
    '\\providecommand{\\ME}{ME}',
    '\\providecommand{\\CD}{CD}',
    '\\providecommand{\\FO}{FO}',
    '\\providecommand{\\SFO}{SFO}',
    '\\providecommand{\\NOTC}{\\ensuremath{\\neg\\mathrm{C}}}',
    '\\providecommand{\\ANDC}{\\ensuremath{\\wedge\\mathrm{C}}}',
    '\\providecommand{\\ANDBC}{\\ensuremath{\\wedge\\mathrm{BC}}}',
    '\\providecommand{\\ORC}{\\ensuremath{\\vee\\mathrm{C}}}',
    '\\providecommand{\\ORBC}{\\ensuremath{\\vee\\mathrm{BC}}}'
  ].join('\n');
}

function importInstructions(kind: 'graph' | 'table', filename: string): string {
  const environment = kind === 'graph' ? 'figure' : 'table';
  const requiredPackages = kind === 'graph'
    ? [
        '%   \\usepackage{amsmath,amssymb}',
        '%   \\usepackage{graphicx}',
        '%   \\usepackage{tikz}',
        '%   \\usetikzlibrary{arrows.meta,shapes.geometric}'
      ]
    : [
        '%   \\usepackage{amsmath,amssymb}',
        '%   \\usepackage{graphicx}'
      ];
  const includeLine = kind === 'graph'
    ? '%   \\resizebox{\\linewidth}{!}{\\input{' + filename + '}}'
    : '%   \\input{' + filename + '}';

  return [
    '% -----------------------------------------------------------------------------',
    '% HOW TO INCLUDE THIS EXPORT IN A PAPER',
    '% This file is a LaTeX fragment, not a standalone document.',
    '% Add these once to your preamble:',
    ...requiredPackages,
    '% Then place the following where you want the ' + kind + ':',
    '%   \\begin{' + environment + '}[tb]',
    '%   \\centering',
    includeLine,
    '%   \\caption{...}',
    '%   \\label{' + (kind === 'graph' ? 'fig' : 'tab') + ':tcz-' + filename.replace(/^tcz-/, '').replace(/\.tex$/, '') + '}',
    '%   \\end{' + environment + '}',
    kind === 'graph'
      ? '% For a two-column paper, prefer figure* so the labels remain readable.'
      : '% The export already constrains wide tables to \\textwidth.',
    '% -----------------------------------------------------------------------------'
  ].join('\n');
}

function sharedCellStyles(): string {
  return [
    '\\providecommand{\\TCZCellPoly}{\\ensuremath{\\leq_p}}',
    '\\providecommand{\\TCZCellPolyConditional}{\\ensuremath{\\leq_p^{\\ast}}}',
    '\\providecommand{\\TCZCellNoPolyUnknownQuasi}{\\ensuremath{\\not\\leq_p\\;\\leq_q^{?}}}',
    '\\providecommand{\\TCZCellNoPolyUnknownQuasiConditional}{\\ensuremath{\\not\\leq_p^{\\ast}\\;\\leq_q^{?}}}',
    '\\providecommand{\\TCZCellNoPolyQuasi}{\\ensuremath{\\not\\leq_p\\;\\leq_q}}',
    '\\providecommand{\\TCZCellNoPolyQuasiConditional}{\\ensuremath{\\not\\leq_p^{\\ast}\\;\\leq_q}}',
    '\\providecommand{\\TCZCellUnknownPolyQuasi}{\\ensuremath{\\leq_p^{?}\\;\\leq_q}}',
    '\\providecommand{\\TCZCellUnknownBoth}{\\ensuremath{?}}',
    '\\providecommand{\\TCZCellNoQuasi}{\\ensuremath{\\not\\leq_q}}',
    '\\providecommand{\\TCZCellPolyCollapsed}{\\ensuremath{\\leq}}',
    '\\providecommand{\\TCZCellPolyCollapsedConditional}{\\ensuremath{\\leq^{\\ast}}}',
    '\\providecommand{\\TCZCellNotPolyCollapsed}{\\ensuremath{\\not\\leq}}',
    '\\providecommand{\\TCZCellNotPolyCollapsedConditional}{\\ensuremath{\\not\\leq^{\\ast}}}',
    '\\providecommand{\\TCZCellUnknownCollapsed}{\\ensuremath{?}}',
    '\\providecommand{\\TCZOperationPoly}{\\ensuremath{\\checkmark}}',
    '\\providecommand{\\TCZOperationPolyConditional}{\\ensuremath{\\checkmark^{\\ast}}}',
    '\\providecommand{\\TCZOperationNoPoly}{\\ensuremath{\\bullet}}',
    '\\providecommand{\\TCZOperationNoPolyConditional}{\\ensuremath{\\circ}}',
    '\\providecommand{\\TCZOperationUnknown}{\\ensuremath{?}}'
  ].join('\n');
}

function relationCell(status: string, conditional: boolean, collapsed: boolean): string {
  if (collapsed) {
    if (status === 'poly') return conditional ? '\\TCZCellPolyCollapsedConditional' : '\\TCZCellPolyCollapsed';
    if (status === 'not-poly') return conditional ? '\\TCZCellNotPolyCollapsedConditional' : '\\TCZCellNotPolyCollapsed';
    return '\\TCZCellUnknownCollapsed';
  }

  const suffix = conditional ? 'Conditional' : '';
  switch (status) {
    case 'poly':
      return '\\TCZCellPoly' + suffix;
    case 'no-poly-unknown-quasi':
      return '\\TCZCellNoPolyUnknownQuasi' + suffix;
    case 'no-poly-quasi':
      return '\\TCZCellNoPolyQuasi' + suffix;
    case 'unknown-poly-quasi':
      return '\\TCZCellUnknownPolyQuasi';
    case 'no-quasi':
      return '\\TCZCellNoQuasi';
    default:
      return '\\TCZCellUnknownBoth';
  }
}

function operationCell(support: KCOpSupport | undefined): string {
  if (!support || ['unknown', 'unknown-both', 'unknown-to-us', 'unknown-poly-quasi'].includes(support.complexity)) {
    return '\\TCZOperationUnknown';
  }
  if (support.complexity === 'poly') {
    return support.assumption ? '\\TCZOperationPolyConditional' : '\\TCZOperationPoly';
  }
  return support.assumption ? '\\TCZOperationNoPolyConditional' : '\\TCZOperationNoPoly';
}

function relationAt(data: GraphData | FilteredGraphData, sourceId: string, targetId: string): DirectedSuccinctnessRelation | null {
  const sourceIndex = data.adjacencyMatrix.indexByLanguage[sourceId];
  const targetIndex = data.adjacencyMatrix.indexByLanguage[targetId];
  if (sourceIndex === undefined || targetIndex === undefined) return null;
  return data.adjacencyMatrix.matrix[sourceIndex]?.[targetIndex] ?? null;
}

function arrowSpec(sourceStatus: string | null, targetStatus: string | null): string {
  const sourceTip = sourceStatus ? GRAPH_TIPS[sourceStatus] : null;
  const targetTip = targetStatus ? GRAPH_TIPS[targetStatus] : null;
  if (sourceTip && targetTip) return '{' + sourceTip + '}-{' + targetTip + '}';
  if (sourceTip) return '{' + sourceTip + '}-';
  if (targetTip) return '-{' + targetTip + '}';
  return '';
}

function graphStyles(): string {
  return [
    '\\tikzset{',
    '  tcz export node/.style={ellipse, draw=black!35, fill=white, minimum width=10mm, minimum height=7.5mm, inner xsep=3.5pt, inner ysep=2pt, align=center, font=\\small\\bfseries},',
    '  tcz export edge/.style={draw=black!55, line width=.55pt}',
    '}'
  ].join('\n');
}

function graphPositions(
  data: GraphData | FilteredGraphData,
  languages: KCLanguage[],
  livePositions: Record<string, NodePosition> | undefined
): Map<string, NodePosition> {
  const configured = data.defaultNodePositionsByLanguageName ?? {};
  const result = new Map<string, NodePosition>();
  languages.forEach((language, index) => {
    const position = livePositions?.[language.id] ?? configured[language.name];
    result.set(language.id, position ?? { x: index * 160, y: Math.floor(index / 6) * 160 });
  });
  return result;
}

function graphExportCoordinates(
  languages: KCLanguage[],
  positions: Map<string, NodePosition>
): Map<string, NodePosition> {
  const values = Array.from(positions.values());
  const minX = Math.min(...values.map((position) => position.x));
  const maxX = Math.max(...values.map((position) => position.x));
  const minY = Math.min(...values.map((position) => position.y));
  const maxY = Math.max(...values.map((position) => position.y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  // The browser layout permits closely stacked nodes. In TeX that makes labels
  // collide, so preserve its horizontal order while giving each visual row room.
  const rowTolerance = Math.max(height * 0.03, 1);
  const orderedByY = [...languages].sort((left, right) => {
    const yDifference = positions.get(left.id)!.y - positions.get(right.id)!.y;
    return yDifference || left.id.localeCompare(right.id);
  });
  const rows: KCLanguage[][] = [];
  const rowAnchors: number[] = [];
  for (const language of orderedByY) {
    const y = positions.get(language.id)!.y;
    const lastRow = rows.length - 1;
    if (lastRow < 0 || Math.abs(y - rowAnchors[lastRow]) > rowTolerance) {
      rows.push([language]);
      rowAnchors.push(y);
    } else {
      rows[lastRow].push(language);
    }
  }

  const xScale = 15.5 / width;
  const rowGap = 1.15;
  const result = new Map<string, NodePosition>();
  rows.forEach((row, rowIndex) => {
    const rowByX = [...row].sort((left, right) => {
      const xDifference = positions.get(left.id)!.x - positions.get(right.id)!.x;
      return xDifference || left.id.localeCompare(right.id);
    });
    let previousX = Number.NEGATIVE_INFINITY;
    let previousWidth = 0;
    rowByX.forEach((language) => {
      const position = positions.get(language.id)!;
      const labelLength = language.name.replace(/[^A-Za-z0-9<>-]/g, '').length;
      const labelWidth = Math.max(1, labelLength * 0.17 + 0.45);
      const preferredX = (position.x - minX) * xScale;
      const minimumX = previousX + (previousWidth + labelWidth) / 2 + 0.5;
      result.set(language.id, {
        x: Math.max(preferredX, minimumX),
        y: (rows.length - 1 - rowIndex) * rowGap
      });
      previousX = Math.max(preferredX, minimumX);
      previousWidth = labelWidth;
    });
  });
  return result;
}

export function renderGraphLatex(
  data: GraphData | FilteredGraphData,
  options: LatexExportOptions = {}
): string {
  const ids = visibleLanguageIds(data);
  const languages = languagesForIds(data, ids);
  if (languages.length === 0) {
    return [
      importInstructions('graph', 'tcz-graph'),
      '% No languages are visible under the current filters.',
      '\\begin{center}\\emph{No languages are visible under the current filters.}\\end{center}'
    ].join('\n');
  }
  const positions = graphPositions(data, languages, options.nodePositions);
  const exportCoordinates = graphExportCoordinates(languages, positions);
  const nodeNames = new Map(languages.map((language, index) => [language.id, 'tczn' + (index + 1)]));
  const visibleEdges = 'visibleEdgeIds' in data ? data.visibleEdgeIds : null;
  const visibleIds = new Set(languages.map((language) => language.id));

  const nodeLines = languages.map((language) => {
    const position = exportCoordinates.get(language.id)!;
    return '\\node[tcz export node] (' + nodeNames.get(language.id) + ') at (' + numeric(position.x) + ',' + numeric(position.y) + ') {' + latexGraphLabel(language) + '};';
  });

  const edgeLines = normalizeEdgePairs(data.adjacencyMatrix)
    .filter((edge) => visibleIds.has(edge.nodeA) && visibleIds.has(edge.nodeB))
    .flatMap((edge) => {
      const forwardVisible = !visibleEdges || visibleEdges.has(edge.nodeA + '->' + edge.nodeB);
      const backwardVisible = !visibleEdges || visibleEdges.has(edge.nodeB + '->' + edge.nodeA);
      const forwardStatus = forwardVisible ? edge.aToB : null;
      const backwardStatus = backwardVisible ? edge.bToA : null;
      const arrows = arrowSpec(backwardStatus, forwardStatus);
      if (!arrows) return [];
      return ['\\draw[tcz export edge, ' + arrows + '] (' + nodeNames.get(edge.nodeA) + ') -- (' + nodeNames.get(edge.nodeB) + ');'];
    });

  return [
    importInstructions('graph', 'tcz-graph'),
    '% Filters and browser node positions guide the export; closely stacked nodes are separated for legibility.',
    languageMacros(),
    graphStyles(),
    '\\begin{tikzpicture}',
    ...nodeLines,
    ...edgeLines,
    '\\end{tikzpicture}'
  ].join('\n');
}

export function renderSuccinctnessTableLatex(data: GraphData | FilteredGraphData): string {
  const ids = visibleLanguageIds(data);
  const languages = languagesForIds(data, ids);
  const collapsed = isCollapsed(data);
  const headerCells = languages.map((language) => '\\rotatebox{90}{' + latexLanguage(language.name) + '}');
  const rowLines = languages.map((rowLanguage) => {
    const cells = languages.map((columnLanguage) => {
      if (rowLanguage.id === columnLanguage.id) return '\\ensuremath{=}';
      const relation = relationAt(data, columnLanguage.id, rowLanguage.id);
      return relationCell(relation?.status ?? 'unknown-both', Boolean(relation?.assumption), collapsed);
    });
    return latexLanguage(rowLanguage.name) + ' & ' + cells.join(' & ') + ' \\\\';
  });
  const columnSpec = 'l' + 'c'.repeat(languages.length);

  return [
    importInstructions('table', 'tcz-succinctness-table'),
    '% Rows are targets and columns are sources.',
    languageMacros(),
    sharedCellStyles(),
    '\\begin{center}',
    '\\scriptsize',
    '\\setlength{\\tabcolsep}{3pt}',
    '\\resizebox{\\textwidth}{!}{%',
    '\\begin{tabular}{' + columnSpec + '}',
    ' & ' + headerCells.join(' & ') + ' \\\\ \\hline',
    ...rowLines,
    '\\end{tabular}%',
    '}',
    '\\end{center}'
  ].join('\n');
}

function operationTable(
  data: GraphData | FilteredGraphData,
  kind: 'queries' | 'transforms'
): string {
  const ids = visibleLanguageIds(data);
  const languages = languagesForIds(data, ids);
  const definitions = kind === 'queries' ? QUERIES : TRANSFORMATIONS;
  const visibleOperations = kind === 'queries'
    ? ('visibleQueryIds' in data ? data.visibleQueryIds : new Set(Object.keys(definitions)))
    : ('visibleTransformationIds' in data ? data.visibleTransformationIds : new Set(Object.keys(definitions)));
  const operationIds = Object.keys(definitions).filter((id) => visibleOperations.has(id));
  const headerCells = operationIds.map((id) => OPERATION_MACROS[id] ?? definitions[id]?.code ?? id);
  const rowLines = languages.map((language) => {
    const supportMap = kind === 'queries' ? language.properties.queries : language.properties.transformations;
    const cells = operationIds.map((id) => operationCell(supportMap?.[id] ?? supportMap?.[definitions[id]?.code ?? id]));
    return latexLanguage(language.name) + ' & ' + cells.join(' & ') + ' \\\\';
  });
  const columnSpec = 'l' + 'c'.repeat(operationIds.length);
  const title = kind === 'queries' ? 'query' : 'transformation';

  return [
    importInstructions('table', 'tcz-' + (kind === 'queries' ? 'queries-table' : 'transformations-table')),
    '% Filters reflect the current view.',
    languageMacros(),
    operationMacros(),
    sharedCellStyles(),
    '\\begin{center}',
    '\\scriptsize',
    '\\setlength{\\tabcolsep}{4pt}',
    '\\begin{tabular}{' + columnSpec + '}',
    ' & ' + headerCells.join(' & ') + ' \\\\ \\hline',
    ...rowLines,
    '\\end{tabular}',
    '\\end{center}'
  ].join('\n');
}

export function renderQueriesTableLatex(data: GraphData | FilteredGraphData): string {
  return operationTable(data, 'queries');
}

export function renderTransformationsTableLatex(data: GraphData | FilteredGraphData): string {
  return operationTable(data, 'transforms');
}

export function createLatexExport(
  viewMode: ViewMode,
  data: GraphData | FilteredGraphData,
  options: LatexExportOptions = {}
): LatexExport {
  switch (viewMode) {
    case 'graph':
      return { filename: 'tcz-graph.tex', content: renderGraphLatex(data, options) };
    case 'succinctness':
      return { filename: 'tcz-succinctness-table.tex', content: renderSuccinctnessTableLatex(data) };
    case 'queries':
      return { filename: 'tcz-queries-table.tex', content: renderQueriesTableLatex(data) };
    case 'transforms':
      return { filename: 'tcz-transformations-table.tex', content: renderTransformationsTableLatex(data) };
  }
}
