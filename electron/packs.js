/**
 * Built-in slideshow packs.
 *
 * Media is NOT committed to the repo — `packs/` is gitignored — but it IS
 * shipped: `build:win` runs `npm run packs:sync` (see scripts/sync-packs.mjs)
 * first, copying from the source folders below into `packs/`, which
 * electron-builder bundles as extraResources. Keeping it out of git avoids
 * ~127 MB of binaries in history while still producing a complete installer.
 *
 * A build where a source folder is missing still succeeds; that pack reports
 * zero items and the UI greys it out.
 *
 * Packs hold images and short videos alike — the slideshow caps any video at
 * 15s and always plays it muted.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PACKS = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Widescreen film stills',
    // Only used by the sync script, never at runtime.
    source: 'C:\\Users\\LENOVO\\Desktop\\cinematic',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Illustrated scenes and key art',
    source: 'C:\\Users\\LENOVO\\Desktop\\anime',
  },
  {
    id: 'superheroes',
    name: 'Superheroes',
    description: 'Comic and film hero art',
    source: 'C:\\Users\\LENOVO\\Desktop\\superheroes',
  },
  {
    id: 'live',
    name: 'Live',
    description: 'Looping live wallpapers (video)',
    source: 'C:\\Users\\LENOVO\\Desktop\\live',
  },
];

const PACK_IDS = new Set(PACKS.map((p) => p.id));

export function isPackId(value) {
  return typeof value === 'string' && PACK_IDS.has(value);
}

/**
 * Root directory holding the pack folders.
 *
 * Packaged: `<resources>/packs` (electron-builder extraResources).
 * Dev:      `<project>/packs`.
 *
 * `isPackaged` is passed in rather than imported so this module stays free of
 * the electron dependency and can be unit-tested / used by the sync script.
 */
export function getPacksRoot({ isPackaged, resourcesPath }) {
  return isPackaged
    ? path.join(resourcesPath, 'packs')
    : path.join(__dirname, '..', 'packs');
}

/** Absolute directory for one pack id, or '' when the id is unknown. */
export function getPackDir(packId, ctx) {
  if (!isPackId(packId)) return '';
  return path.join(getPacksRoot(ctx), packId);
}

/** Every pack directory — used as the media-protocol allowlist. */
export function getAllPackDirs(ctx) {
  const root = getPacksRoot(ctx);
  return PACKS.map((p) => path.join(root, p.id));
}

/**
 * Pack metadata plus what each currently holds, so Settings can label them
 * accurately ("12 videos" vs "20 images") and grey out ones never synced.
 *
 * `scanMedia` returns the pack's media URLs; those carry the real file extension
 * (see toMediaUrl), so video can be counted straight off the suffix.
 */
export async function listPacks(ctx, scanMedia) {
  return Promise.all(PACKS.map(async (pack) => {
    const dir = path.join(getPacksRoot(ctx), pack.id);
    let count = 0;
    let videoCount = 0;
    try {
      await fs.access(dir);
      const items = await scanMedia(dir);
      count = items.length;
      videoCount = items.filter((url) => /\.(mp4|m4v|webm|mov)$/i.test(url)).length;
    } catch {
      count = 0;
      videoCount = 0;
    }
    return { id: pack.id, name: pack.name, description: pack.description, count, videoCount };
  }));
}
