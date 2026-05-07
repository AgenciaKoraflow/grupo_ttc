import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('nome');
  if (error) {
    console.error('[profiles.service] fetch:', error);
    return [];
  }
  return (data ?? []) as Profile[];
}

export type ProfileCreate = {
  nome: string;
  email: string;
  role: UserRole;
  equipe_id: string | null;
};

export async function createProfile(
  data: ProfileCreate,
): Promise<{ profile: Profile; tempPassword: string }> {
  const { data: result, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'create', ...data },
  });
  if (error) {
    // FunctionsHttpError: extract the actual message from the response body.
    let message = error.message;
    try {
      const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
      if (body?.error) message = body.error;
    } catch { /* response may not be JSON */ }
    console.error('[profiles.service] create:', message);
    throw new Error(message);
  }
  if (result?.error) throw new Error(result.error as string);
  return { profile: result.profile as Profile, tempPassword: result.tempPassword as string };
}

export type ProfileUpdate = {
  updated_at: string;
  nome?: string;
  role?: UserRole;
  equipe_id?: string | null;
  must_change_password?: boolean;
  ativo?: boolean;
};

export async function updateProfile(id: string, data: ProfileUpdate): Promise<void> {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) console.error('[profiles.service] update:', error);
}

// Email requires Auth Admin API — the sync_profile_email DB trigger handles
// keeping profiles.email in sync after the auth.users email is updated.
export async function updateProfileEmail(userId: string, email: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'update-email', user_id: userId, email },
  });
  if (error) console.error('[profiles.service] update-email:', error);
}

// Deletes via Admin API because direct DELETE on profiles would leave the
// auth.users row intact — the user could still log in.
// CASCADE auth.users → profiles removes the DB row automatically.
export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'delete', user_id: id },
  });
  if (error) console.error('[profiles.service] delete:', error);
}
