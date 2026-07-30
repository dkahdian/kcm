import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';
import { build as viteBuild } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticBuild = path.join(root, 'build');
const output = path.join(root, 'review-build');
const pages = ['index.html', 'about.html', 'bibliography.html'];

await runProductionBuild();
await recreateOutputDirectory();

const workerSource = await readOnlyWorker();
const checksums = [];
for (const page of pages) {
  const sourcePath = path.join(staticBuild, page);
  let html = await fs.readFile(sourcePath, 'utf8');
  html = await inlineStyles(html, sourcePath);
  html = removeModulePreloads(html);
  html = rewriteStaticNavigation(html);

  const boot = extractBootScript(html, page);
  html = boot.html;
  const javascript = await bundlePage(boot.source, workerSource, page);
  html = injectNavigationBridge(html);
  html = html.replace(
    '</body>',
    () => `\n\t\t<script>${escapeClosingScript(javascript)}</script>\n\t</body>`
  );

  const destination = path.join(output, page);
  await fs.writeFile(destination, html, 'utf8');
  checksums.push(`${sha256(html)}  ${page}`);
}

await fs.writeFile(
  path.join(output, 'README.txt'),
  [
    'Tractable Circuit Zoo — reviewer build',
    '',
    'Double-click index.html to open the application.',
    'about.html and bibliography.html are also self-contained and may be opened directly.',
    '',
    'The visualization, sandbox, propagation, certification, and LaTeX export run locally.',
    'External reference links require internet access. Contribution submission is disabled during review.',
    '',
    'SHA-256 checksums are recorded in SHA256SUMS.txt.'
  ].join('\n'),
  'utf8'
);
await fs.writeFile(path.join(output, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`, 'utf8');

console.log(`Reviewer build written to ${output}`);
for (const page of pages) {
  const stats = await fs.stat(path.join(output, page));
  console.log(`  ${page}: ${(stats.size / 1024 / 1024).toFixed(2)} MiB`);
}

async function runProductionBuild() {
  await viteBuild({ root });
}

async function recreateOutputDirectory() {
  const relative = path.relative(root, output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to replace output directory outside the repository: ${output}`);
  }
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
}

async function readOnlyWorker() {
  const workerDirectory = path.join(staticBuild, '_app', 'immutable', 'workers');
  const files = (await fs.readdir(workerDirectory)).filter((file) => file.endsWith('.js'));
  if (files.length !== 1) {
    throw new Error(`Expected exactly one built worker, found ${files.length}`);
  }
  return fs.readFile(path.join(workerDirectory, files[0]), 'utf8');
}

async function inlineStyles(html, htmlPath) {
  const stylesheetPattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
  const tags = [...html.matchAll(stylesheetPattern)];
  for (const match of tags) {
    const href = match[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || isExternalUrl(href)) continue;
    const cssPath = path.resolve(path.dirname(htmlPath), stripQueryAndHash(href));
    let css = await fs.readFile(cssPath, 'utf8');
    css = await inlineCssAssets(css, cssPath);
    html = html.replace(
      match[0],
      () => `<style data-source="${escapeHtml(href)}">${css}</style>`
    );
  }
  return html;
}

async function inlineCssAssets(css, cssPath) {
  const references = [...css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)];
  for (const reference of references) {
    const assetUrl = reference[2];
    if (isExternalUrl(assetUrl) || assetUrl.startsWith('data:') || assetUrl.startsWith('#')) continue;
    const assetPath = path.resolve(path.dirname(cssPath), stripQueryAndHash(assetUrl));
    const data = await fs.readFile(assetPath);
    const encoded = `data:${mimeType(assetPath)};base64,${data.toString('base64')}`;
    css = css.replace(reference[0], () => `url("${encoded}")`);
  }
  return css;
}

function removeModulePreloads(html) {
  return html.replace(/\s*<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi, '');
}

function rewriteStaticNavigation(html) {
  return html
    .replace(/href=(["'])\/#/g, 'href=$1./index.html#')
    .replace(/href=(["'])\/about\1/g, 'href=$1./about.html$1')
    .replace(/href=(["'])\/bibliography\1/g, 'href=$1./bibliography.html$1')
    .replace(/href=(["'])\/\1/g, 'href=$1./index.html$1');
}

function extractBootScript(html, page) {
  const pattern = /\s*<script>\s*(\{\s*__sveltekit_[\s\S]*?)<\/script>/;
  const match = html.match(pattern);
  if (!match) throw new Error(`Could not find the SvelteKit boot script in ${page}`);
  return { html: html.replace(match[0], ''), source: match[1] };
}

async function bundlePage(bootSource, workerSource, page) {
  let workerReferenceReplacements = 0;
  const workerReference = /new URL\(""\+new URL\("\.\.\/workers\/[^"\n]+",import\.meta\.url\)\.href,import\.meta\.url\)/g;
  const result = await bundle({
    stdin: {
      contents:
        `globalThis.__TCZ_REVIEW_WORKER_URL__ = URL.createObjectURL(` +
        `new Blob([${JSON.stringify(workerSource)}], { type: "text/javascript" }));\n` +
        bootSource,
      resolveDir: staticBuild,
      sourcefile: `${page}.entry.js`,
      loader: 'js'
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    minify: true,
    legalComments: 'none',
    plugins: [
      {
        name: 'review-file-protocol-adapter',
        setup(build) {
          build.onLoad({ filter: /[\\/]_app[\\/]immutable[\\/].*\.js$/ }, async ({ path: file }) => {
            let contents = await fs.readFile(file, 'utf8');
            // All CSS is already embedded in the page; suppress Vite's dynamic CSS preloader.
            contents = contents.replace(/__vite__mapDeps\(\[[^\]]*\]\)/g, '[]');
            contents = contents.replace(workerReference, () => {
              workerReferenceReplacements += 1;
              return 'globalThis.__TCZ_REVIEW_WORKER_URL__';
            });
            // The dependency list is empty, so Vite's optional base URL is unnecessary.
            contents = contents.replace(/,\[\],import\.meta\.url\)/g, ',[])');
            return { contents, loader: 'js' };
          });
        }
      }
    ]
  });
  if (workerReferenceReplacements === 0) {
    throw new Error(`The generated worker reference was not found while packaging ${page}`);
  }
  if (result.outputFiles.length !== 1) {
    throw new Error(`Expected one JavaScript bundle for ${page}, found ${result.outputFiles.length}`);
  }
  const javascript = result.outputFiles[0].text;
  // Parse without executing so a malformed inline script fails the build.
  new Function(javascript);
  return javascript;
}

function injectNavigationBridge(html) {
  const script = `<script>
document.addEventListener("click", function (event) {
  const origin = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
  const link = origin && origin.closest("a");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = link.getAttribute("href");
  let destination = null;
  if (href === "/") destination = "./index.html";
  else if (href === "/about") destination = "./about.html";
  else if (href === "/bibliography") destination = "./bibliography.html";
  else if (href && href.startsWith("/#")) destination = "./index.html" + href.slice(1);
  if (destination !== null) {
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = destination;
  }
}, true);
</script>`;
  return html.replace('</head>', `${script}\n\t</head>`);
}

function escapeClosingScript(javascript) {
  return javascript.replace(/<\/script/gi, '<\\/script');
}

function stripQueryAndHash(url) {
  return url.split(/[?#]/, 1)[0];
}

function isExternalUrl(url) {
  return /^(?:[a-z]+:|\/\/)/i.test(url);
}

function mimeType(file) {
  switch (path.extname(file).toLowerCase()) {
    case '.woff2': return 'font/woff2';
    case '.woff': return 'font/woff';
    case '.ttf': return 'font/ttf';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
