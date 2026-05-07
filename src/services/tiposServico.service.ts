import { supabase } from '@/lib/supabase';
import type { TipoServico } from '@/types';

export async function fetchTiposServico(): Promise<TipoServico[]> {
  const { data, error } = await supabase.from('tipos_servico').select('*').order('nome');
  if (error) {
    console.error('[tiposServico.service] fetch:', error);
    return [];
  }
  return (data ?? []) as TipoServico[];
}

export type TipoServicoInsert = Pick<TipoServico, 'id' | 'nome' | 'descricao' | 'ativo'>;

export async function insertTipoServico(payload: TipoServicoInsert): Promise<void> {
  const { error } = await supabase.from('tipos_servico').insert(payload);
  if (error) console.error('[tiposServico.service] insert:', error);
}

export type TipoServicoUpdate = {
  updated_at: string;
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
};

export async function updateTipoServico(id: string, data: TipoServicoUpdate): Promise<void> {
  const { error } = await supabase.from('tipos_servico').update(data).eq('id', id);
  if (error) console.error('[tiposServico.service] update:', error);
}

export async function deleteTipoServico(id: string): Promise<void> {
  const { error } = await supabase.from('tipos_servico').delete().eq('id', id);
  if (error) console.error('[tiposServico.service] delete:', error);
}
