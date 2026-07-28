/**
 * imageCache.ts
 *
 * Unified image cache utility.
 * - Downloads images to local device storage via expo-file-system
 * - Maintains a JSON manifest tracking: url, localPath, lastAccessed, sizeBytes
 * - Enforces a 200 MB cap with LRU (least-recently-used) eviction
 * - Exposed API:
 *     cacheImageIfNeeded(url)  → returns local file:/// path (or original url on failure)
 *     getCacheSizeBytes()      → total bytes used by image cache
 *     clearImageCache()        → delete all cached images and reset manifest
 */

import * as FileSystem from 'expo-file-system/legacy';

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_DIR = FileSystem.documentDirectory + 'cached_images/';
const MANIFEST_PATH = FileSystem.documentDirectory + 'cached_images_manifest.json';
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB

// ─── Types ───────────────────────────────────────────────────────────────────

interface ManifestEntry {
  url: string;
  localPath: string;
  originalUrl: string; // Always preserved so we can fall back to network
  lastAccessed: number; // Unix timestamp ms
  sizeBytes: number;
}

type CacheManifest = Record<string, ManifestEntry>; // keyed by url

// ─── Manifest I/O ────────────────────────────────────────────────────────────

async function readManifest(): Promise<CacheManifest> {
  try {
    const info = await FileSystem.getInfoAsync(MANIFEST_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
    return JSON.parse(raw) as CacheManifest;
  } catch {
    return {};
  }
}

async function writeManifest(manifest: CacheManifest): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(manifest));
  } catch (e) {
    console.warn('[ImageCache] Failed to write manifest:', e);
  }
}

// ─── Directory ───────────────────────────────────────────────────────────────

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// ─── Filename from URL ───────────────────────────────────────────────────────

function getSafeFilename(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  const cleanName = url.split('/').pop()?.replace(/[^a-zA-Z0-9.]/g, '_') || 'img';
  return `${Math.abs(hash)}_${cleanName}`;
}

// ─── LRU Eviction ────────────────────────────────────────────────────────────

async function evictLRU(manifest: CacheManifest): Promise<CacheManifest> {
  const totalBytes = Object.values(manifest).reduce((sum, e) => sum + (e.sizeBytes || 0), 0);
  if (totalBytes <= MAX_CACHE_BYTES) return manifest;

  // Sort entries by lastAccessed ascending (oldest first)
  const entries = Object.entries(manifest).sort(
    ([, a], [, b]) => a.lastAccessed - b.lastAccessed
  );

  let currentBytes = totalBytes;
  const updated = { ...manifest };

  for (const [url, entry] of entries) {
    if (currentBytes <= MAX_CACHE_BYTES) break;
    try {
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (info.exists) {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
      }
      currentBytes -= entry.sizeBytes || 0;
      delete updated[url];
      console.log(`[ImageCache] LRU evicted: ${entry.localPath} (freed ${Math.round((entry.sizeBytes || 0) / 1024)} KB)`);
    } catch (e) {
      console.warn('[ImageCache] LRU eviction error:', e);
    }
  }

  return updated;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Download and cache an image if not already cached.
 * Updates lastAccessed on every call (even cache hits).
 * Returns local file:/// URI on success, or original URL as fallback.
 */
export async function cacheImageIfNeeded(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;

  try {
    await ensureCacheDir();
    const manifest = await readManifest();

    // Cache hit — verify local file still exists, then update lastAccessed
    if (manifest[url]) {
      const entry = manifest[url];
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (info.exists) {
        manifest[url] = { ...entry, lastAccessed: Date.now() };
        await writeManifest(manifest);
        return entry.localPath;
      }
      // Local file was deleted externally — remove stale entry and re-download
      delete manifest[url];
    }

    // Cache miss — download the file
    const filename = getSafeFilename(url);
    const localPath = CACHE_DIR + filename;

    const result = await FileSystem.downloadAsync(url, localPath);

    // CRITICAL: downloadAsync does NOT throw on HTTP errors (404, 403, etc.).
    // Must check status code explicitly — a non-200 response downloads an error HTML page.
    if (!result || result.status !== 200) {
      console.warn(`[ImageCache] Download failed with HTTP ${result?.status} for: ${url}`);
      // Delete the corrupted file (error HTML page) so it does not pollute the cache
      try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch { /* ignore */ }
      return url; // Fall back to original URL
    }

    // Get file size for manifest
    let sizeBytes = 0;
    try {
      const info = await FileSystem.getInfoAsync(localPath);
      sizeBytes = (info as any).size || 0;
    } catch { /* size is a nice-to-have */ }

    manifest[url] = {
      url,
      localPath,
      originalUrl: url, // Preserve original so component layer can fall back
      lastAccessed: Date.now(),
      sizeBytes,
    };

    // Run LRU eviction if over limit
    const evicted = await evictLRU(manifest);
    await writeManifest(evicted);

    return result.uri;
  } catch (e) {
    console.warn(`[ImageCache] Failed to cache image: ${url}`, e);
    return url; // Fallback to original URL
  }
}

/**
 * Returns total bytes used by the image cache based on the manifest.
 */
export async function getCacheSizeBytes(): Promise<number> {
  try {
    const manifest = await readManifest();
    return Object.values(manifest).reduce((sum, e) => sum + (e.sizeBytes || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Deletes all cached image files and resets the manifest.
 */
export async function clearImageCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
    const manifestInfo = await FileSystem.getInfoAsync(MANIFEST_PATH);
    if (manifestInfo.exists) {
      await FileSystem.deleteAsync(MANIFEST_PATH, { idempotent: true });
    }
    console.log('[ImageCache] Cache cleared.');
  } catch (e) {
    console.warn('[ImageCache] Failed to clear cache:', e);
    throw e;
  }
}

/**
 * Returns formatted cache size string e.g. "47.2 MB" or "820 KB"
 */
export async function getCacheSizeLabel(): Promise<string> {
  const bytes = await getCacheSizeBytes();
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}
