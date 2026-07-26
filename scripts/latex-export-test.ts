import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initialGraphData, getAllEdgeFilters, getAllLanguageFilters } from '../src/lib/data/index.js';
import { applyFiltersWithParams, computeEffectiveFilterState } from '../src/lib/filter-utils.js';
import {
  createLatexExport,
  renderQueriesTableLatex,
  renderSuccinctnessTableLatex
} from '../src/lib/utils/latex-export.js';

const languageFilters = getAllLanguageFilters();
const edgeFilters = getAllEdgeFilters();

function filtered(view: 'graph' | 'succinctness' | 'queries' | 'transforms') {
  return applyFiltersWithParams(
    initialGraphData,
    languageFilters,
    edgeFilters,
    computeEffectiveFilterState(languageFilters, edgeFilters, view, new Map()),
    view
  );
}

const graph = createLatexExport('graph', filtered('graph'));
const succinctnessData = filtered('succinctness');
const succinctness = createLatexExport('succinctness', succinctnessData);
const queries = createLatexExport('queries', filtered('queries'));
const transformations = createLatexExport('transforms', filtered('transforms'));

assert.equal(graph.filename, 'tcz-graph.tex');
assert.match(graph.content, /\\begin\{tikzpicture\}/);
assert.match(graph.content, /\\langref\{CNF\}/);
assert.match(graph.content, /\\langfam\{d-SDNNF\}\{T\}/);
assert.match(graph.content, /HOW TO INCLUDE THIS EXPORT IN A PAPER/);
assert.match(graph.content, /\\resizebox\{\\linewidth\}\{!\}\{\\input\{tcz-graph\}\}/);
assert.match(graph.content, /\\providecommand\{\\langref\}/);
assert.equal((graph.content.match(/\\node\[tcz export node\]/g) ?? []).length, 21);
const graphData = filtered('graph');
const livePositions = Object.fromEntries(
  Array.from(graphData.visibleLanguageIds).map((id, index) => [id, { x: index * 100, y: 0 }])
);
const graphWithLivePositions = createLatexExport('graph', graphData, { nodePositions: livePositions });
assert.match(graphWithLivePositions.content, / at \(0,0\)/);
assert.match(graphWithLivePositions.content, /closely stacked nodes are separated for legibility/);

assert.equal(succinctness.filename, 'tcz-succinctness-table.tex');
assert.match(succinctness.content, /Rows are targets and columns are sources/);
const decSdnnf = succinctnessData.languages.find((language) => language.name === 'dec-SDNNF$_T$');
const obdd = succinctnessData.languages.find((language) => language.name === 'OBDD$_<$');
assert.ok(decSdnnf && obdd, 'Expected the dec-SDNNF and OBDD family members to be present in the succinctness view');
const decSdnnfIndex = succinctnessData.adjacencyMatrix.indexByLanguage[decSdnnf.id];
const obddIndex = succinctnessData.adjacencyMatrix.indexByLanguage[obdd.id];
assert.equal(
  succinctnessData.adjacencyMatrix.matrix[decSdnnfIndex]?.[obddIndex]?.status,
  'no-poly-quasi',
  'the default frontend data must preserve mixed polynomial/quasipolynomial compilation statuses'
);
assert.match(succinctness.content, /\\TCZCellNoPolyQuasi/);
assert.match(succinctness.content, /\\input\{tcz-succinctness-table\}/);
assert.match(succinctness.content, /\\rotatebox\{90\}\{\\langfam\{SDNNF\}\{T\}\}/);

const collapsedSuccinctness = applyFiltersWithParams(
  initialGraphData,
  languageFilters,
  edgeFilters,
  computeEffectiveFilterState(languageFilters, edgeFilters, 'succinctness', new Map([['poly-display', false]])),
  'succinctness'
);
const collapsedDecSdnnfIndex = collapsedSuccinctness.adjacencyMatrix.indexByLanguage[decSdnnf.id];
const collapsedObddIndex = collapsedSuccinctness.adjacencyMatrix.indexByLanguage[obdd.id];
assert.equal(
  collapsedSuccinctness.adjacencyMatrix.matrix[collapsedDecSdnnfIndex]?.[collapsedObddIndex]?.status,
  'not-poly',
  'the display filter should still allow an explicit collapse to polynomial-only distinctions'
);

assert.equal(queries.filename, 'tcz-queries-table.tex');
assert.match(queries.content, /\\CO & \\VA/);
assert.match(queries.content, /\\providecommand\{\\CO\}/);
assert.equal(transformations.filename, 'tcz-transformations-table.tex');
assert.match(transformations.content, /\\CD & \\FO/);

const onlyConsistency = {
  ...filtered('queries'),
  visibleQueryIds: new Set(['CO'])
};
const onlyConsistencyLatex = renderQueriesTableLatex(onlyConsistency);
assert.match(onlyConsistencyLatex, / & \\CO \\\\ \\hline/);
assert.doesNotMatch(onlyConsistencyLatex, / & \\CO & \\VA/);

const quasiData = filtered('succinctness');
quasiData.complexities = {
  ...quasiData.complexities,
  poly: {
    ...quasiData.complexities.poly,
    notation: '$\\leq_p$'
  }
};
const quasiLatex = renderSuccinctnessTableLatex(quasiData);
assert.match(quasiLatex, /\\TCZCellPoly/);

const tempRoot = path.join(process.cwd(), 'tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const tempDir = fs.mkdtempSync(path.join(tempRoot, 'latex-export-test-'));

try {
  const documentSource = [
    '\\documentclass{article}',
    '\\usepackage{amsmath,amssymb,graphicx,tikz}',
    '\\usetikzlibrary{arrows.meta,shapes.geometric}',
    '\\begin{document}',
    graph.content,
    succinctness.content,
    queries.content,
    transformations.content,
    '\\end{document}'
  ].join('\n');
  const sourcePath = path.join(tempDir, 'exports.tex');
  fs.writeFileSync(sourcePath, documentSource, 'utf8');

  const result = spawnSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'exports.tex'], {
    cwd: tempDir,
    encoding: 'utf8'
  });
  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.log('pdflatex not found; renderer assertions passed and compilation was skipped.');
  } else {
    assert.equal(
      result.status,
      0,
      'pdflatex failed:\n' + (result.stdout ?? '') + '\n' + (result.stderr ?? '')
    );
    assert.ok(fs.existsSync(path.join(tempDir, 'exports.pdf')), 'pdflatex did not produce exports.pdf');

    for (const filename of [
      'zoo-graph.tex',
      'zoo-succinctness-table.tex',
      'zoo-queries-table.tex',
      'zoo-transformations-table.tex'
    ]) {
      const source = path.join(process.cwd(), 'docs', filename);
      assert.ok(fs.existsSync(source), 'Missing generated docs export: ' + filename);
      const documentResult = spawnSync(
        'pdflatex',
        ['-interaction=nonstopmode', '-halt-on-error', '-output-directory=' + tempDir, source],
        { cwd: tempDir, encoding: 'utf8' }
      );
      assert.equal(
        documentResult.status,
        0,
        'pdflatex failed for ' + filename + ':\n' + (documentResult.stdout ?? '') + '\n' + (documentResult.stderr ?? '')
      );
    }
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('LaTeX export tests passed.');
