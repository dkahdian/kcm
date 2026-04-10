import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');

const DEFAULT_OVERLEAF_URL = 'https://git@git.overleaf.com/68dae4280ea24f339c402509';
const OVERLEAF_SOURCE_SUBDIR = 'git';

function runGit(args: string[], cwd?: string, inheritOutput = true): string {
  const stdio = inheritOutput ? 'inherit' : 'pipe';
  const result = execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio
  });
  return typeof result === 'string' ? result.trim() : '';
}

async function clearDirectory(targetDir: string): Promise<void> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true }))
  );
}

async function copyDirectoryContents(sourceDir: string, targetDir: string): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyDirectoryContents(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function hasLocalDocsChanges(): boolean {
  const output = runGit(['status', '--porcelain', '--', 'docs'], repoRoot, false);
  return output.length > 0;
}

async function main(): Promise<void> {
  if (process.env.SKIP_OVERLEAF_PULL === '1') {
    console.log('SKIP_OVERLEAF_PULL=1 set; skipping Overleaf pull.');
    return;
  }

  if (hasLocalDocsChanges() && process.env.OVERLEAF_PULL_FORCE !== '1') {
    throw new Error(
      'Local changes detected under docs/. Commit or stash them first, or set OVERLEAF_PULL_FORCE=1.'
    );
  }

  const overleafRepoUrl =
    process.env.OVERLEAF_GIT_URL ||
    process.env.OVERLEAF_REPO_URL ||
    DEFAULT_OVERLEAF_URL;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'overleaf-pull-'));

  try {
    console.log(`Cloning Overleaf repository: ${overleafRepoUrl}`);
    runGit(['clone', '--depth', '1', overleafRepoUrl, tempDir], repoRoot);

    const sourceDir = path.join(tempDir, OVERLEAF_SOURCE_SUBDIR);
    const sourceStat = await fs.stat(sourceDir).catch(() => null);

    if (!sourceStat || !sourceStat.isDirectory()) {
      throw new Error(`Expected Overleaf directory /${OVERLEAF_SOURCE_SUBDIR} not found.`);
    }

    console.log(`Replacing ${docsDir} with Overleaf /${OVERLEAF_SOURCE_SUBDIR}`);
    await clearDirectory(docsDir);
    await copyDirectoryContents(sourceDir, docsDir);

    console.log('Overleaf pull complete.');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('Overleaf pull failed:', error);
  process.exit(1);
});
