import { supabase } from '@/lib/supabase';
import type { Equipe } from '@/types';

export async function fetchEquipes(): Promise<Equipe[]> {
  const { data, error } = await supabase.from('equipes').select('*').order('nome');
  if (error) {
    console.error('[equipes.service] fetch:', error);
    return [];
  }
  return (data ?? []) as Equipe[];
}

export type EquipeInsert = Pick<Equipe, 'id' | 'nome' | 'ativa'>;

export async function insertEquipe(payload: EquipeInsert): Promise<void> {
  const { error } = await supabase.from('equipes').insert(payload);
  if (error) console.error('[equipes.service] insert:', error);
}

export type EquipeUpdate = {
  updated_at: string;
  nome?: string;
  ativa?: boolean;
};

export async function updateEquipe(id: string, data: EquipeUpdate): Promise<void> {
  const { error } = await supabase.from('equipes').update(data).eq('id', id);
  if (error) console.error('[equipes.service] update:', error);
}

export async function deleteEquipe(id: string): Promise<void> {
  const { error } = await supabase.from('equipes').delete().eq('id', id);
  if (error) console.error('[equipes.service] delete:', error);
}

export async function nullifyEquipeInProfiles(equipeId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ equipe_id: null })
    .eq('equipe_id', equipeId);
  if (error) console.error('[equipes.service] nullify profiles FK:', error);
}
