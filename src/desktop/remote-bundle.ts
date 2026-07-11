/**
 * Remote-bundle hot updates for bonkjs/desktop — DIRECT-DOWNLOAD builds only.
 *
 * The shell/content split: the Electron shell (~100MB, signed+notarized)
 * almost never changes; the game's vite bundle (a few MB) changes constantly.
 * This module updates the CONTENT without re-downloading the shell: serve the
 * newest local bundle instantly (offline-capable), background-fetch the
 * deploy's manifest.json, download only files whose hash changed (vite's
 * content-hashed chunks make most of the bundle a natural cache hit), verify
 * sha256, stage atomically, serve on next launch.
 *
 * ── STEAM BUILDS MUST NOT USE THIS ─────────────────────────────────────────
 * Steam's depot system delta-patches the whole app natively, players expect
 * patches to arrive through Steam, and self-updating game content outside
 * Steam's pipeline is policy-gray. Omit `remoteBundle` in the Steam-channel
 * package. `remoteBundle` is for builds players download directly (dmg/zip
 * from your site or itch) — there it replaces "re-download the app every
 * patch" AND keeps a multiplayer client protocol-aligned with the same web
 * deploy the browser players run.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Manifest shape (generate at build time; deploy beside the bundle):
 *   {
 *     "version": "<stable content hash of all file hashes>",
 *     "builtAt": "<ISO timestamp — orders packaged vs cached bundles>",
 *     "files": { "index.html": "<sha256 hex>", "assets/x-abc.js": "...", ... }
 *   }
 *
 * Cache layout (under the game's userData — survives app re-installs):
 *   <cacheDir>/versions/<version>/...   the staged bundles
 *   <cacheDir>/current.json             { version } pointer, written atomically
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface BundleManifest {
  version: string;
  builtAt: string;
  files: Record<string, string>;
}

export interface RemoteBundleOptions {
  /** https URL of the deployed manifest.json (files fetch from its directory). */
  manifestUrl: string;
  /** Cache root. Default: `<userData>/bundle-cache` (set by the shell). */
  cacheDir?: string;
  /** Called after a new version is staged; serving switches next launch. */
  onUpdateReady?: (version: string) => void;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

const sha256 = (buf: Uint8Array): string => createHash('sha256').update(buf).digest('hex');

async function readManifest(dir: string): Promise<BundleManifest | null> {
  try {
    const m = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as BundleManifest;
    return m && typeof m.version === 'string' && m.files ? m : null;
  } catch {
    return null;
  }
}

/** Reject traversal — every manifest path must resolve inside `root`. */
function safeJoin(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new Error(`unsafe path in manifest: ${rel}`);
  return abs;
}

async function currentCacheVersion(cacheDir: string): Promise<string | null> {
  try {
    const cur = JSON.parse(await fs.readFile(path.join(cacheDir, 'current.json'), 'utf8')) as { version?: string };
    return typeof cur.version === 'string' ? cur.version : null;
  } catch {
    return null;
  }
}

/**
 * Pick the bundle to serve THIS launch: the cached version if present and at
 * least as new (builtAt) as the packaged one, else the packaged webDir.
 * Never touches the network — launch is instant and offline-safe.
 */
export async function resolveServedBundle(
  packagedDir: string,
  cacheDir: string,
): Promise<{ dir: string; manifest: BundleManifest | null; source: 'cache' | 'packaged' }> {
  const packagedManifest = await readManifest(packagedDir);
  const version = await currentCacheVersion(cacheDir);
  if (version) {
    const dir = path.join(cacheDir, 'versions', version);
    const cached = await readManifest(dir);
    if (cached && (!packagedManifest || cached.builtAt >= packagedManifest.builtAt)) {
      return { dir, manifest: cached, source: 'cache' };
    }
  }
  return { dir: packagedDir, manifest: packagedManifest, source: 'packaged' };
}

/**
 * Background update check. Downloads/copies into a staging dir, verifies every
 * file's sha256 against the manifest, then atomically publishes the version.
 * Failures log and leave the current bundle untouched — never crash the game.
 */
export async function checkForBundleUpdate(args: {
  opts: RemoteBundleOptions;
  packagedDir: string;
  cacheDir: string;
  served: BundleManifest | null;
  servedDir: string;
  fetch: FetchLike;
  log: (msg: string) => void;
}): Promise<void> {
  const { opts, packagedDir, cacheDir, served, servedDir, log } = args;
  try {
    const res = await args.fetch(`${opts.manifestUrl}${opts.manifestUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
    const remote = JSON.parse(Buffer.from(await res.arrayBuffer()).toString('utf8')) as BundleManifest;
    if (!remote?.version || !remote.files) throw new Error('malformed manifest');

    if (served?.version === remote.version) {
      log(`bundle up to date (${remote.version.slice(0, 8)})`);
      return;
    }
    if ((await currentCacheVersion(cacheDir)) === remote.version) {
      log(`bundle ${remote.version.slice(0, 8)} already staged — serves next launch`);
      return;
    }

    const baseUrl = opts.manifestUrl.replace(/[^/]*$/, '');
    const staging = path.join(cacheDir, `staging-${remote.version}`);
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    // Local dedupe sources: the bundle we're serving + the packaged fallback.
    const localSources = [...new Set([servedDir, packagedDir])];
    let downloaded = 0;
    let copied = 0;

    for (const [rel, hash] of Object.entries(remote.files)) {
      const dest = safeJoin(staging, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });

      let bytes: Uint8Array | null = null;
      for (const src of localSources) {
        try {
          const candidate = await fs.readFile(safeJoin(src, rel));
          if (sha256(candidate) === hash) {
            bytes = candidate;
            copied++;
            break;
          }
        } catch {
          /* not local — download below */
        }
      }
      if (!bytes) {
        const r = await args.fetch(baseUrl + rel.split('/').map(encodeURIComponent).join('/'));
        if (!r.ok) throw new Error(`fetch ${rel}: ${r.status}`);
        bytes = new Uint8Array(await r.arrayBuffer());
        if (sha256(bytes) !== hash) throw new Error(`hash mismatch: ${rel}`);
        downloaded++;
      }
      await fs.writeFile(dest, bytes);
    }
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(remote));

    // Publish atomically: staging → versions/<v>, then swap the pointer file.
    const finalDir = path.join(cacheDir, 'versions', remote.version);
    await fs.rm(finalDir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(finalDir), { recursive: true });
    await fs.rename(staging, finalDir);
    const pointerTmp = path.join(cacheDir, 'current.json.tmp');
    await fs.writeFile(pointerTmp, JSON.stringify({ version: remote.version }));
    await fs.rename(pointerTmp, path.join(cacheDir, 'current.json'));

    // Prune: keep only the new version (+ the one still being served, if cached).
    try {
      const keep = new Set([remote.version, served?.version]);
      for (const v of await fs.readdir(path.join(cacheDir, 'versions'))) {
        if (!keep.has(v)) await fs.rm(path.join(cacheDir, 'versions', v), { recursive: true, force: true });
      }
    } catch {
      /* prune is best-effort */
    }

    log(`bundle ${remote.version.slice(0, 8)} staged (${downloaded} downloaded, ${copied} reused) — serves next launch`);
    opts.onUpdateReady?.(remote.version);
  } catch (err) {
    log(`bundle update check failed (game unaffected): ${String(err)}`);
  }
}
