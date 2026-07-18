/**
 * Copy the built-in slideshow pack media (images and short videos) from their
 * source folders into `packs/`, which electron-builder bundles as
 * extraResources.
 *
 * `build:win` runs this automatically, so packs ship by default. `packs/` stays
 * gitignored — the media is regenerated from source rather than versioned, which
 * keeps ~127 MB of binaries out of git history.
 *
 * If a source folder is missing the build still succeeds; that pack ships empty
 * and Settings greys it out.
 *
 *   npm run packs:sync
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PACKS, getPacksRoot } from '../electron/packs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
  '.mp4', '.m4v', '.webm', '.mov',
]);

const root = getPacksRoot({ isPackaged: false });

let totalFiles = 0;
let totalBytes = 0;
let missing = 0;

for (const pack of PACKS) {
  const dest = path.join(root, pack.id);

  let entries;
  try {
    entries = await fs.readdir(pack.source, { withFileTypes: true });
  } catch {
    console.log(`  ${pack.id.padEnd(12)} SKIPPED — source not found: ${pack.source}`);
    missing += 1;
    continue;
  }

  // Start clean so removals in the source propagate instead of accumulating.
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });

  let files = 0;
  let bytes = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const from = path.join(pack.source, entry.name);
    await fs.copyFile(from, path.join(dest, entry.name));
    bytes += (await fs.stat(from)).size;
    files += 1;
  }

  totalFiles += files;
  totalBytes += bytes;
  console.log(`  ${pack.id.padEnd(12)} ${String(files).padStart(4)} images  ${(bytes / 1e6).toFixed(1).padStart(7)} MB`);
}

console.log(`\n  ${String(totalFiles).padStart(4)} images  ${(totalBytes / 1e6).toFixed(1).padStart(7)} MB → ${path.relative(path.join(__dirname, '..'), root)}/`);
if (missing) {
  console.log(`  ${missing} pack(s) skipped. Builds will ship those as empty.`);
}
console.log('');
