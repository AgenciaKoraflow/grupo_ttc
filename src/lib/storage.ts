import { supabase } from './supabase';

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getSignedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  if (error || !data) return new Map();
  return new Map(
    data.filter(d => d.signedUrl).map(d => [d.path as string, d.signedUrl as string])
  );
}
