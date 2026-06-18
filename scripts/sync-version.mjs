import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/sync-version.mjs <version-or-tag>');
  process.exit(1);
}

const version = tag.replace(/^v/, '');
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`Invalid version: "${version}" (from tag "${tag}")`);
  process.exit(1);
}

if (pkg.version === version) {
  console.log(`package.json already at ${version}, skipping.`);
  process.exit(0);
}

pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Updated package.json version: ${pkg.version} → ${version}`);
