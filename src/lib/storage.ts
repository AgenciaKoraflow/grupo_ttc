import { supabase } from './supabase';

const TTL_MS = 50 * 60 * 1000; // 50 min — safe margin before 60 min expiry

function cacheKey(bucket: string, path: string) {
  return `su:${bucket}:${path}`;
}

function readCache(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { url, exp } = JSON.parse(raw) as { url: string; exp: number };
    if (Date.now() < exp) return url;
    sessionStorage.removeItem(key);
  } catch { /* ignore */ }
  return null;
}

function writeCache(key: string, url: string) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ url, exp: Date.now() + TTL_MS }));
  } catch { /* ignore quota errors */ }
}

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const key = cacheKey(bucket, path);
  const cached = readCache(key);
  if (cached) return cached;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  writeCache(key, data.signedUrl);
  return data.signedUrl;
}

export async function getSignedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();

  const result = new Map<string, string>();
  const uncached: string[] = [];

  for (const path of paths) {
    const url = readCache(cacheKey(bucket, path));
    if (url) result.set(path, url);
    else uncached.push(path);
  }

  if (uncached.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uncached, 3600);
    if (!error && data) {
      for (const d of data) {
        if (d.signedUrl && d.path) {
          result.set(d.path, d.signedUrl);
          writeCache(cacheKey(bucket, d.path), d.signedUrl);
        }
      }
    }
  }

  return result;
}
