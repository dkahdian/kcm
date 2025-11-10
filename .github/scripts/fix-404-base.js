#!/usr/bin/env node

/**
 * Fix 404.html to dynamically detect base path for subdirectory deployments
 * 
 * GitHub Pages only uses /404.html at root for fallback routing.
 * This script modifies 404.html to detect if it's in a /previews/pr-X subdirectory
 * and set the base path accordingly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html404Path = path.join(process.cwd(), 'build', '404.html');

console.log('Looking for 404.html at:', html404Path);

if (!fs.existsSync(html404Path)) {
  console.error('404.html not found at:', html404Path);
  process.exit(1);
}

let content = fs.readFileSync(html404Path, 'utf8');

// Find the sveltekit config object with base and assets
const configRegex = /(__sveltekit_\w+\s*=\s*\{[^}]*\})/s;
const configMatch = content.match(configRegex);

if (!configMatch) {
  console.error('Could not find SvelteKit config object in 404.html');
  process.exit(1);
}

const originalConfig = configMatch[1];
console.log('Found SvelteKit config');

// Create dynamic config that detects base path at runtime
const dynamicConfig = `const __basePath = (() => {
							const path = window.location.pathname;
							const match = path.match(/^\\/previews\\/pr-\\d+/);
							return match ? match[0] : "";
						})();
					${originalConfig.replace(/__sveltekit_\w+/, '__sveltekit_config').replace(/base:\s*"[^"]*"/, 'base: __basePath').replace(/assets:\s*"[^"]*"/, 'assets: __basePath')}`;

console.log('Replacing with dynamic detection...');

content = content.replace(configRegex, dynamicConfig);

fs.writeFileSync(html404Path, content, 'utf8');

console.log('✅ Successfully updated 404.html with dynamic base path detection');
console.log('   - Root deployments will use base: ""');
console.log('   - Preview deployments (/previews/pr-X) will use base: "/previews/pr-X"');
