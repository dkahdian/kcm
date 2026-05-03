import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const OVERLEAF_TARGET_SUBDIR = 'git';

const DEFAULT_OVERLEAF_URL = 'https://git@git.overleaf.com/68dae4280ea24f339c402509';

function runGit(args: string[], cwd?: string, inheritOutput = true): string {
  const stdio = inheritOutput ? 'inherit' : 'pipe';
  const result = execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio
  });
  return typeof result === 'string' ? result.trim() : '';
}

function hasStagedChanges(cwd: string): boolean {
  const check = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, stdio: 'ignore' });
  return check.status !== 0;
}

async function clearDirectoryExceptGit(targetDir: string): Promise<void> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.name !== '.git')
      .map((entry) => fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true }))
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

async function main(): Promise<void> {
  if (process.env.SKIP_OVERLEAF_PUSH === '1') {
    console.log('SKIP_OVERLEAF_PUSH=1 set; skipping Overleaf sync.');
    return;
  }

  const overleafRepoUrl =
    process.env.OVERLEAF_GIT_URL ||
    process.env.OVERLEAF_REPO_URL ||
    DEFAULT_OVERLEAF_URL;

  const authorName = process.env.OVERLEAF_GIT_AUTHOR_NAME || 'starai-sync-bot';
  const authorEmail = process.env.OVERLEAF_GIT_AUTHOR_EMAIL || 'starai-sync@example.com';

  const commitMessage =
    process.env.OVERLEAF_COMMIT_MESSAGE ||
    `Sync docs from tcz (${new Date().toISOString()})`;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'overleaf-sync-'));

  try {
    console.log(`Cloning Overleaf repository: ${overleafRepoUrl}`);
    runGit(['clone', '--depth', '1', overleafRepoUrl, tempDir], repoRoot);

    const branch =
      process.env.OVERLEAF_BRANCH ||
      runGit(['-C', tempDir, 'rev-parse', '--abbrev-ref', 'HEAD'], repoRoot, false) ||
      'master';

    const targetDir = path.join(tempDir, OVERLEAF_TARGET_SUBDIR);
    await fs.mkdir(targetDir, { recursive: true });

    console.log(`Syncing ${docsDir} to Overleaf branch ${branch} in /${OVERLEAF_TARGET_SUBDIR}`);
    await clearDirectoryExceptGit(targetDir);
    await copyDirectoryContents(docsDir, targetDir);

    runGit(['-C', tempDir, 'add', '-A'], repoRoot);

    if (!hasStagedChanges(tempDir)) {
      console.log('No Overleaf changes to push.');
      return;
    }

    runGit(['-C', tempDir, 'config', 'user.name', authorName], repoRoot);
    runGit(['-C', tempDir, 'config', 'user.email', authorEmail], repoRoot);

    runGit(['-C', tempDir, 'commit', '-m', commitMessage], repoRoot);
    runGit(['-C', tempDir, 'push', 'origin', `HEAD:${branch}`], repoRoot);

    console.log('Overleaf sync complete.');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('Overleaf sync failed:', error);
  process.exit(1);
});
