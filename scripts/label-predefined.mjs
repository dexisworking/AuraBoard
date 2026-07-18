/**
 * Rename the packs-bundled installer to `-predefined` and repoint the update
 * manifest at it.
 *
 * Both build scripts share one electron-builder config, so they both emit
 * `AuraBoard-Setup-<version>.exe`. The release publishes them side by side under
 * different names, and `latest.yml` — which electron-updater reads to decide what
 * to download — must name the file that actually exists on the release.
 *
 * Getting this wrong fails silently: the updater downloads whatever sits at the
 * stale filename, then rejects it on the sha512 check. Renaming by hand after
 * every build is exactly the kind of step that gets forgotten, hence this script.
 *
 * Idempotent — safe to re-run.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const RELEASE_DIR = 'release';
const PLAIN = `AuraBoard-Setup-${version}.exe`;
const LABELLED = `AuraBoard-Setup-${version}-predefined.exe`;

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function renameIfPresent(from, to) {
  const src = path.join(RELEASE_DIR, from);
  const dest = path.join(RELEASE_DIR, to);
  if (await exists(src)) {
    await fs.rename(src, dest);
    console.log(`  renamed  ${from} -> ${to}`);
    return true;
  }
  if (await exists(dest)) {
    console.log(`  already  ${to}`);
    return true;
  }
  console.log(`  missing  ${from}`);
  return false;
}

await renameIfPresent(PLAIN, LABELLED);
await renameIfPresent(`${PLAIN}.blockmap`, `${LABELLED}.blockmap`);

/* Repoint the update manifest. Only the filename changes — electron-builder
   already wrote the correct sha512/size for this binary.

   The channel build emits `predefined.yml`; `latest.yml` is handled as a
   fallback in case the channel override was dropped, so a misconfigured build
   still produces a self-consistent manifest rather than one naming a file that
   is not on the release. */
const MANIFEST = 'predefined.yml';
let manifest = null;
for (const candidate of [MANIFEST, 'latest.yml']) {
  if (await exists(path.join(RELEASE_DIR, candidate))) { manifest = candidate; break; }
}

if (!manifest) {
  console.log('  missing  predefined.yml and latest.yml');
} else {
  if (manifest !== MANIFEST) {
    console.warn(`  WARNING: found ${manifest}, expected ${MANIFEST}.`);
    console.warn('           The publish channel override is missing — this build would');
    console.warn('           update on the same lane as the standard installer.');
  }
  const p = path.join(RELEASE_DIR, manifest);
  const before = await fs.readFile(p, 'utf8');
  const after = before.replaceAll(PLAIN, LABELLED);
  if (before !== after) {
    await fs.writeFile(p, after);
    console.log(`  manifest ${manifest} -> ${LABELLED}`);
  } else {
    console.log(`  manifest ${manifest} already correct`);
  }
}

const m = manifest ?? MANIFEST;
console.log(`\n  Publish with:\n    gh release upload <tag> ${RELEASE_DIR}/${LABELLED} ${RELEASE_DIR}/${LABELLED}.blockmap ${RELEASE_DIR}/${m} --clobber\n`);
